const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PredictionMarket", function () {
  let predictionMarket;
  let aiOracle;
  let gaslessRelayer;
  let owner, oracle, user1, user2, user3;

  beforeEach(async function () {
    [owner, oracle, user1, user2, user3] = await ethers.getSigners();

    // Deploy PredictionMarket
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();

    // Deploy AIOracle
    const AIOracle = await ethers.getContractFactory("AIOracle");
    aiOracle = await AIOracle.deploy(await predictionMarket.getAddress());
    await aiOracle.waitForDeployment();

    // Deploy GaslessRelayer
    const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
    gaslessRelayer = await GaslessRelayer.deploy();
    await gaslessRelayer.waitForDeployment();

    // Configure contracts
    await predictionMarket.setAuthorizedOracle(await aiOracle.getAddress(), true);
    await predictionMarket.setAuthorizedOracle(oracle.address, true);
    await gaslessRelayer.setWhitelistedContract(await predictionMarket.getAddress(), true);
  });

  describe("Market Creation", function () {
    it("Should create a market with correct parameters", async function () {
      const futureTime = (await time.latest()) + 86400; // +1 day
      
      await predictionMarket.createMarket(
        "Will it rain tomorrow?",
        "Market description",
        "weather",
        futureTime,
        true
      );

      const market = await predictionMarket.markets(1);
      expect(market.question).to.equal("Will it rain tomorrow?");
      expect(market.category).to.equal("weather");
      expect(market.creator).to.equal(owner.address);
      expect(market.resolved).to.be.false;
    });

    it("Should fail if end time is in the past", async function () {
      const pastTime = (await time.latest()) - 1000;
      
      await expect(
        predictionMarket.createMarket(
          "Question",
          "Description",
          "category",
          pastTime,
          false
        )
      ).to.be.revertedWith("End time must be in the future");
    });

    it("Should fail if question is empty", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await expect(
        predictionMarket.createMarket(
          "",
          "Description",
          "category",
          futureTime,
          false
        )
      ).to.be.revertedWith("Question cannot be empty");
    });

    it("Should increment market count", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      expect(await predictionMarket.marketCount()).to.equal(0);
      
      await predictionMarket.createMarket("Q1", "D1", "C1", futureTime, false);
      expect(await predictionMarket.marketCount()).to.equal(1);
      
      await predictionMarket.createMarket("Q2", "D2", "C2", futureTime, false);
      expect(await predictionMarket.marketCount()).to.equal(2);
    });
  });

  describe("Position Taking", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket(
        "Test Question",
        "Test Description",
        "test",
        futureTime,
        false
      );
    });

    it("Should allow buying YES position", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: betAmount
      });

      const position = await predictionMarket.getUserPosition(1, user1.address);
      expect(position.yesAmount).to.equal(betAmount);
      expect(position.noAmount).to.equal(0);
    });

    it("Should allow buying NO position", async function () {
      const betAmount = ethers.parseEther("0.5");
      
      await predictionMarket.connect(user1).buyPosition(1, false, {
        value: betAmount
      });

      const position = await predictionMarket.getUserPosition(1, user1.address);
      expect(position.yesAmount).to.equal(0);
      expect(position.noAmount).to.equal(betAmount);
    });

    it("Should update market totals correctly", async function () {
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      
      await predictionMarket.connect(user2).buyPosition(1, false, {
        value: ethers.parseEther("0.5")
      });

      const market = await predictionMarket.markets(1);
      expect(market.totalYesAmount).to.equal(ethers.parseEther("1.0"));
      expect(market.totalNoAmount).to.equal(ethers.parseEther("0.5"));
    });

    it("Should fail if bet amount is too low", async function () {
      await expect(
        predictionMarket.connect(user1).buyPosition(1, true, {
          value: ethers.parseEther("0.0005") // Less than MIN_BET (0.001 STT on Somnia)
        })
      ).to.be.revertedWith("Bet amount too low");
    });

    it("Should fail if market has ended", async function () {
      // Fast forward time
      await time.increase(86400 + 1);
      
      await expect(
        predictionMarket.connect(user1).buyPosition(1, true, {
          value: ethers.parseEther("1.0")
        })
      ).to.be.revertedWith("Market has ended");
    });

    it("Should fail if market is resolved", async function () {
      // Fast forward time and resolve
      await time.increase(86400 + 1);
      await predictionMarket.connect(oracle).resolveMarket(1, true);
      
      await expect(
        predictionMarket.connect(user1).buyPosition(1, true, {
          value: ethers.parseEther("1.0")
        })
      ).to.be.revertedWith("Market already resolved");
    });
  });

  describe("Market Odds", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket(
        "Test Question",
        "Test Description",
        "test",
        futureTime,
        false
      );
    });

    it("Should return 50/50 odds for new market", async function () {
      const [yesOdds, noOdds] = await predictionMarket.getMarketOdds(1);
      expect(yesOdds).to.equal(5000);
      expect(noOdds).to.equal(5000);
    });

    it("Should calculate odds correctly after bets", async function () {
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("3.0")
      });
      
      await predictionMarket.connect(user2).buyPosition(1, false, {
        value: ethers.parseEther("1.0")
      });

      const [yesOdds, noOdds] = await predictionMarket.getMarketOdds(1);
      
      // 3 STT YES, 1 STT NO = 75% YES, 25% NO
      expect(yesOdds).to.equal(7500);
      expect(noOdds).to.equal(2500);
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket(
        "Test Question",
        "Test Description",
        "test",
        futureTime,
        false
      );
    });

    it("Should allow authorized oracle to resolve", async function () {
      await time.increase(86400 + 1);
      
      await predictionMarket.connect(oracle).resolveMarket(1, true);
      
      const market = await predictionMarket.markets(1);
      expect(market.resolved).to.be.true;
      expect(market.outcome).to.be.true;
    });

    it("Should fail if not authorized oracle", async function () {
      await time.increase(86400 + 1);
      
      await expect(
        predictionMarket.connect(user1).resolveMarket(1, true)
      ).to.be.revertedWith("Not authorized oracle");
    });

    it("Should fail if market has not ended", async function () {
      await expect(
        predictionMarket.connect(oracle).resolveMarket(1, true)
      ).to.be.revertedWith("Market has not ended");
    });

    it("Should fail if already resolved", async function () {
      await time.increase(86400 + 1);
      await predictionMarket.connect(oracle).resolveMarket(1, true);
      
      await expect(
        predictionMarket.connect(oracle).resolveMarket(1, false)
      ).to.be.revertedWith("Market already resolved");
    });
  });

  describe("Winnings Calculation and Claiming", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket(
        "Test Question",
        "Test Description",
        "test",
        futureTime,
        false
      );

      // Place bets
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("2.0")
      });
      
      await predictionMarket.connect(user2).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      
      await predictionMarket.connect(user3).buyPosition(1, false, {
        value: ethers.parseEther("3.0")
      });

      // Resolve market
      await time.increase(86400 + 1);
      await predictionMarket.connect(oracle).resolveMarket(1, true); // YES wins
    });

    it("Should calculate winnings correctly for winners", async function () {
      // User1 bet 2 STT on YES (total YES: 3 STT, total NO: 3 STT)
      // User1 share: 2/3 of YES pool
      // User1 winnings: 2 STT (original) + 2 STT (from NO pool) = 4 STT
      const winnings = await predictionMarket.calculateWinnings(1, user1.address);
      expect(winnings).to.equal(ethers.parseEther("4.0"));
    });

    it("Should return 0 winnings for losers", async function () {
      const winnings = await predictionMarket.calculateWinnings(1, user3.address);
      expect(winnings).to.equal(0);
    });

    it("Should allow winner to claim winnings", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      const tx = await predictionMarket.connect(user1).claimWinnings(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      const expectedWinnings = ethers.parseEther("4.0");
      const fee = (expectedWinnings * 200n) / 10000n; // 2% fee
      const payout = expectedWinnings - fee;
      
      expect(finalBalance).to.be.closeTo(
        initialBalance + payout - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should fail if trying to claim twice", async function () {
      await predictionMarket.connect(user1).claimWinnings(1);
      
      await expect(
        predictionMarket.connect(user1).claimWinnings(1)
      ).to.be.revertedWith("Already claimed");
    });

    it("Should fail if no winnings to claim", async function () {
      await expect(
        predictionMarket.connect(user3).claimWinnings(1)
      ).to.be.revertedWith("No winnings to claim");
    });

    it("Should fail if market not resolved", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);
      
      await expect(
        predictionMarket.connect(user1).claimWinnings(2)
      ).to.be.revertedWith("Market not resolved");
    });
  });

  describe("Administration", function () {
    it("Should allow owner to authorize oracles", async function () {
      expect(await predictionMarket.authorizedOracles(user1.address)).to.be.false;
      
      await predictionMarket.setAuthorizedOracle(user1.address, true);
      
      expect(await predictionMarket.authorizedOracles(user1.address)).to.be.true;
    });

    it("Should fail if non-owner tries to authorize oracle", async function () {
      await expect(
        predictionMarket.connect(user1).setAuthorizedOracle(user2.address, true)
      ).to.be.reverted;
    });
  });
});
