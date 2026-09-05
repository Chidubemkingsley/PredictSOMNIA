const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PredictionMarket - Advanced Tests", function () {
  let predictionMarket;
  let owner, oracle, user1, user2, user3, user4, user5;

  beforeEach(async function () {
    [owner, oracle, user1, user2, user3, user4, user5] = await ethers.getSigners();

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();

    await predictionMarket.setAuthorizedOracle(oracle.address, true);
  });

  describe("Edge Cases", function () {
    it("Should handle very large bets correctly", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      const largeBet = ethers.parseEther("1000");
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: largeBet
      });

      const market = await predictionMarket.markets(1);
      expect(market.totalYesAmount).to.equal(largeBet);
    });

    it("Should handle minimum bet exactly", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      const minBet = ethers.parseEther("0.01");
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: minBet
      });

      const market = await predictionMarket.markets(1);
      expect(market.totalYesAmount).to.equal(minBet);
    });

    it("Should handle market ending exactly at deadline", async function () {
      const currentTime = await time.latest();
      const futureTime = currentTime + 100;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      // Bet before deadline (should succeed)
      await time.increaseTo(futureTime - 2);
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });

      // Bet at or after deadline (should fail)
      await time.increaseTo(futureTime);
      await expect(
        predictionMarket.connect(user1).buyPosition(1, true, {
          value: ethers.parseEther("1.0")
        })
      ).to.be.revertedWith("Market has ended");
    });

    it("Should handle zero total on opposite side", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      // Only YES bets
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });

      const [yesOdds, noOdds] = await predictionMarket.getMarketOdds(1);
      expect(yesOdds).to.equal(10000); // 100%
      expect(noOdds).to.equal(0); // 0%
    });
  });

  describe("Multiple Users Stress Test", function () {
    it("Should handle 5 users betting on same market", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      const users = [user1, user2, user3, user4, user5];
      const amounts = ["1.0", "0.5", "2.0", "1.5", "0.75"];
      const positions = [true, false, true, false, true];

      for (let i = 0; i < users.length; i++) {
        await predictionMarket.connect(users[i]).buyPosition(1, positions[i], {
          value: ethers.parseEther(amounts[i])
        });
      }

      const market = await predictionMarket.markets(1);
      const expectedYes = ethers.parseEther("3.75"); // 1.0 + 2.0 + 0.75
      const expectedNo = ethers.parseEther("2.0");   // 0.5 + 1.5

      expect(market.totalYesAmount).to.equal(expectedYes);
      expect(market.totalNoAmount).to.equal(expectedNo);
    });

    it("Should correctly track positions for all users", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      await predictionMarket.connect(user2).buyPosition(1, false, {
        value: ethers.parseEther("0.5")
      });

      const pos1 = await predictionMarket.getUserPosition(1, user1.address);
      const pos2 = await predictionMarket.getUserPosition(1, user2.address);

      expect(pos1.yesAmount).to.equal(ethers.parseEther("1.0"));
      expect(pos1.noAmount).to.equal(0);
      expect(pos2.yesAmount).to.equal(0);
      expect(pos2.noAmount).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("Multiple Markets", function () {
    it("Should handle multiple markets independently", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await predictionMarket.createMarket("Q1", "D1", "C1", futureTime, false);
      await predictionMarket.createMarket("Q2", "D2", "C2", futureTime, false);
      await predictionMarket.createMarket("Q3", "D3", "C3", futureTime, false);

      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      await predictionMarket.connect(user1).buyPosition(2, false, {
        value: ethers.parseEther("2.0")
      });
      await predictionMarket.connect(user1).buyPosition(3, true, {
        value: ethers.parseEther("1.5")
      });

      const market1 = await predictionMarket.markets(1);
      const market2 = await predictionMarket.markets(2);
      const market3 = await predictionMarket.markets(3);

      expect(market1.totalYesAmount).to.equal(ethers.parseEther("1.0"));
      expect(market2.totalNoAmount).to.equal(ethers.parseEther("2.0"));
      expect(market3.totalYesAmount).to.equal(ethers.parseEther("1.5"));
    });

    it("Should get all market IDs correctly", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      for (let i = 1; i <= 5; i++) {
        await predictionMarket.createMarket(`Q${i}`, "D", "C", futureTime, false);
      }

      const marketIds = await predictionMarket.getAllMarkets();
      expect(marketIds.length).to.equal(5);
      
      for (let i = 0; i < 5; i++) {
        expect(marketIds[i]).to.equal(BigInt(i + 1));
      }
    });
  });

  describe("Winnings Distribution", function () {
    it("Should distribute winnings correctly with multiple winners", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      // YES bets: user1 (2 STT), user2 (1 STT)
      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("2.0")
      });
      await predictionMarket.connect(user2).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });

      // NO bet: user3 (3 STT)
      await predictionMarket.connect(user3).buyPosition(1, false, {
        value: ethers.parseEther("3.0")
      });

      // Resolve: YES wins
      await time.increase(86400 + 1);
      await predictionMarket.connect(oracle).resolveMarket(1, true);

      // Calculate expected winnings
      // Total YES: 3 STT, Total NO: 3 STT
      // User1 (2 STT): 2/3 of NO pool = 2 STT + 2 STT = 4 STT
      // User2 (1 STT): 1/3 of NO pool = 1 STT + 1 STT = 2 STT

      const winnings1 = await predictionMarket.calculateWinnings(1, user1.address);
      const winnings2 = await predictionMarket.calculateWinnings(1, user2.address);
      const winnings3 = await predictionMarket.calculateWinnings(1, user3.address);

      expect(winnings1).to.equal(ethers.parseEther("4.0"));
      expect(winnings2).to.equal(ethers.parseEther("2.0"));
      expect(winnings3).to.equal(0);
    });

    it("Should apply platform fee correctly", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      await predictionMarket.connect(user2).buyPosition(1, false, {
        value: ethers.parseEther("1.0")
      });

      await time.increase(86400 + 1);
      await predictionMarket.connect(oracle).resolveMarket(1, true);

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const winnings = await predictionMarket.calculateWinnings(1, user1.address);
      
      const tx = await predictionMarket.connect(user1).claimWinnings(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      // Expected: 2 STT - 2% fee = 1.96 STT
      const fee = (winnings * 200n) / 10000n;
      const payout = winnings - fee;

      expect(finalBalance).to.be.closeTo(
        initialBalance + payout - gasUsed,
        ethers.parseEther("0.001")
      );
    });
  });

  describe("Oracle Management", function () {
    it("Should allow multiple authorized oracles", async function () {
      await predictionMarket.setAuthorizedOracle(user1.address, true);
      await predictionMarket.setAuthorizedOracle(user2.address, true);

      expect(await predictionMarket.authorizedOracles(user1.address)).to.be.true;
      expect(await predictionMarket.authorizedOracles(user2.address)).to.be.true;
    });

    it("Should allow deauthorizing oracles", async function () {
      await predictionMarket.setAuthorizedOracle(user1.address, true);
      expect(await predictionMarket.authorizedOracles(user1.address)).to.be.true;

      await predictionMarket.setAuthorizedOracle(user1.address, false);
      expect(await predictionMarket.authorizedOracles(user1.address)).to.be.false;
    });

    it("Should prevent deauthorized oracle from resolving", async function () {
      const futureTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Q", "D", "C", futureTime, false);

      await predictionMarket.setAuthorizedOracle(user1.address, true);
      await predictionMarket.setAuthorizedOracle(user1.address, false);

      await time.increase(86400 + 1);
      await expect(
        predictionMarket.connect(user1).resolveMarket(1, true)
      ).to.be.revertedWith("Not authorized oracle");
    });
  });

  describe("Gas Optimization", function () {
    it("Should track gas usage for common operations", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      // Create market
      const tx1 = await predictionMarket.createMarket("Q", "D", "C", futureTime, false);
      const receipt1 = await tx1.wait();
      console.log(`      Gas for createMarket: ${receipt1.gasUsed}`);

      // Buy position
      const tx2 = await predictionMarket.connect(user1).buyPosition(1, true, {
        value: ethers.parseEther("1.0")
      });
      const receipt2 = await tx2.wait();
      console.log(`      Gas for buyPosition: ${receipt2.gasUsed}`);

      // Resolve market
      await time.increase(86400 + 1);
      const tx3 = await predictionMarket.connect(oracle).resolveMarket(1, true);
      const receipt3 = await tx3.wait();
      console.log(`      Gas for resolveMarket: ${receipt3.gasUsed}`);

      // Claim winnings
      const tx4 = await predictionMarket.connect(user1).claimWinnings(1);
      const receipt4 = await tx4.wait();
      console.log(`      Gas for claimWinnings: ${receipt4.gasUsed}`);
    });
  });
});
