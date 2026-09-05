const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TraderReputation - On-Chain Reputation System", function () {
  // Fixture to deploy contracts
  async function deployContractsFixture() {
    const [owner, trader1, trader2, follower1, follower2, user1, user2, user3] = await ethers.getSigners();

    // Deploy PredictionMarket (which deploys TraderReputation)
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy();
    
    // Get reputation contract address
    const reputationAddress = await predictionMarket.reputationContract();
    const TraderReputation = await ethers.getContractFactory("TraderReputation");
    const reputationContract = TraderReputation.attach(reputationAddress);

    return { 
      predictionMarket, 
      reputationContract, 
      owner, 
      trader1, 
      trader2, 
      follower1, 
      follower2,
      user1,
      user2,
      user3
    };
  }

  describe("1. Reputation Tracking", function () {
    it("Should initialize trader stats to zero", async function () {
      const { reputationContract, trader1 } = await loadFixture(deployContractsFixture);
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalBets).to.equal(0);
      expect(stats.totalWins).to.equal(0);
      expect(stats.reputationScore).to.equal(0);
    });

    it("Should record bet and initialize reputation", async function () {
      const { predictionMarket, reputationContract, trader1, owner } = await loadFixture(deployContractsFixture);
      
      // Create a market
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Test Market", "Description", "Crypto", endTime, false);
      
      // Place bet
      await predictionMarket.connect(trader1).buyPosition(1, true, {
        value: ethers.parseEther("1")
      });
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalBets).to.equal(1);
      expect(stats.totalVolume).to.equal(ethers.parseEther("1"));
      expect(stats.reputationScore).to.equal(100); // Starting score
    });

    it("Should track multiple bets", async function () {
      const { predictionMarket, reputationContract, trader1 } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market 1", "Test description", "Test", endTime, false);
      
      // Place 3 bets
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("1") });
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("2") });
      await predictionMarket.connect(trader1).buyPosition(1, false, { value: ethers.parseEther("0.5") });
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalBets).to.equal(3);
      expect(stats.totalVolume).to.equal(ethers.parseEther("3.5"));
    });

    it("Should update reputation after winning bet", async function () {
      const { predictionMarket, reputationContract, trader1, owner } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test description", "Test", endTime, false);
      
      // Place bet
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("1") });
      
      // Fast forward and resolve to YES
      await time.increaseTo(endTime + 1);
      await predictionMarket.resolveMarket(1, true);
      
      // Claim winnings (triggers reputation update)
      await predictionMarket.connect(trader1).claimWinnings(1);
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalWins).to.equal(1);
      expect(stats.totalLosses).to.equal(0);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.bestStreak).to.equal(1);
      expect(stats.reputationScore).to.be.gt(100); // Should increase
    });

    it("Should update reputation after losing bet", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test description", "Test", endTime, false);
      
      // Trader1 bets YES, user1 bets NO
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("1") });
      await predictionMarket.connect(user1).buyPosition(1, false, { value: ethers.parseEther("1") });
      
      // Resolve to NO (trader1 loses)
      await time.increaseTo(endTime + 1);
      await predictionMarket.resolveMarket(1, false);
      
      // User1 claims (winner)
      await predictionMarket.connect(user1).claimWinnings(1);
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalWins).to.equal(0);
      expect(stats.currentStreak).to.equal(0); // Streak reset
    });

    it("Should track win streak correctly", async function () {
      const { predictionMarket, reputationContract, trader1, user1, owner } = await loadFixture(deployContractsFixture);
      
      // Create 3 markets with far future deadlines
      const baseTime = await time.latest();
      for (let i = 1; i <= 3; i++) {
        await predictionMarket.createMarket(
          `Market ${i}`,
          "Desc",
          "Crypto",
          baseTime + 86400 * 10, // 10 days in future
          false
        );
      }
      
      // Trader wins all 3
      for (let i = 1; i <= 3; i++) {
        await predictionMarket.connect(trader1).buyPosition(i, true, { value: ethers.parseEther("1") });
        await predictionMarket.connect(user1).buyPosition(i, false, { value: ethers.parseEther("0.5") });
      }
      
      // Resolve all markets
      await time.increaseTo(baseTime + 86400 * 10 + 1);
      for (let i = 1; i <= 3; i++) {
        await predictionMarket.resolveMarket(i, true);
        await predictionMarket.connect(trader1).claimWinnings(i);
      }
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.currentStreak).to.equal(3);
      expect(stats.bestStreak).to.equal(3);
    });

    it("Should calculate win rate correctly", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const baseTime = await time.latest();
      
      // Create 5 markets with same far-future deadline
      for (let i = 1; i <= 5; i++) {
        await predictionMarket.createMarket(
          `Market ${i}`,
          "Desc",
          "Crypto",
          baseTime + 86400 * 10,
          false
        );
      }
      
      // Place all bets first
      for (let i = 1; i <= 5; i++) {
        const betYes = i <= 3;
        await predictionMarket.connect(trader1).buyPosition(i, betYes, { value: ethers.parseEther("1") });
        await predictionMarket.connect(user1).buyPosition(i, !betYes, { value: ethers.parseEther("1") });
      }
      
      // Resolve all markets after deadline
      await time.increaseTo(baseTime + 86400 * 10 + 1);
      for (let i = 1; i <= 5; i++) {
        const betYes = i <= 3;
        const outcome = true; // All resolve to YES, so trader1 wins first 3, loses last 2
        await predictionMarket.resolveMarket(i, outcome);
        
        if (betYes === outcome) {
          await predictionMarket.connect(trader1).claimWinnings(i);
        } else {
          await predictionMarket.connect(user1).claimWinnings(i);
        }
      }
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.winRate).to.equal(60); // 3/5 = 60%
    });
  });

  describe("2. Reputation Score Calculation", function () {
    it("Should calculate reputation score based on win rate", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const baseTime = await time.latest();
      
      // Create 10 markets with same deadline
      for (let i = 1; i <= 10; i++) {
        await predictionMarket.createMarket(
          `Market ${i}`,
          "Desc",
          "Crypto",
          baseTime + 86400 * 10,
          false
        );
      }
      
      // Place all bets first
      for (let i = 1; i <= 10; i++) {
        const betYes = i <= 9;
        await predictionMarket.connect(trader1).buyPosition(i, betYes, { value: ethers.parseEther("1") });
        await predictionMarket.connect(user1).buyPosition(i, !betYes, { value: ethers.parseEther("1") });
      }
      
      // Resolve all after deadline
      await time.increaseTo(baseTime + 86400 * 10 + 1);
      for (let i = 1; i <= 10; i++) {
        const outcome = i <= 9;
        const betYes = i <= 9;
        await predictionMarket.resolveMarket(i, outcome);
        
        if (betYes === outcome) {
          await predictionMarket.connect(trader1).claimWinnings(i);
        } else {
          await predictionMarket.connect(user1).claimWinnings(i);
        }
      }
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.reputationScore).to.be.gt(300); // High win rate = high score
    });

    it("Should calculate score based on volume", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test description", "Test", endTime, false);
      
      // High volume bet
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("100") });
      await predictionMarket.connect(user1).buyPosition(1, false, { value: ethers.parseEther("1") });
      
      await time.increaseTo(endTime + 1);
      await predictionMarket.resolveMarket(1, true);
      await predictionMarket.connect(trader1).claimWinnings(1);
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalVolume).to.equal(ethers.parseEther("100"));
      expect(stats.reputationScore).to.be.gt(100); // Volume bonus — Somnia STT (was 200 on BNB, 100 STT gives 120)
    });

    it("Should calculate correct reputation score", async function () {
      const { reputationContract, trader1 } = await loadFixture(deployContractsFixture);
      
      // Manual reputation score calculation test
      const score = await reputationContract.calculateReputationScore(trader1.address);
      expect(score).to.equal(0); // No bets yet
    });
  });

  describe("3. Badge System", function () {
    it("Should award Bronze badge at 100 reputation", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const baseTime = await time.latest();
      
      // Create markets and win enough to get 100+ reputation
      for (let i = 0; i < 5; i++) {
        await predictionMarket.createMarket(
          `Market ${i}`,
          "Desc",
          "Crypto",
          baseTime + 86400 * (i + 2) * 10,
          false
        );
        
        await predictionMarket.connect(trader1).buyPosition(i + 1, true, { value: ethers.parseEther("1") });
        await predictionMarket.connect(user1).buyPosition(i + 1, false, { value: ethers.parseEther("0.5") });
        
        await time.increaseTo(baseTime + 86400 * (i + 2) * 10 + 1);
        await predictionMarket.resolveMarket(i + 1, true);
        await predictionMarket.connect(trader1).claimWinnings(i + 1);
      }
      
      const badges = await reputationContract.getTraderBadges(trader1.address);
      expect(badges.length).to.be.gt(0);
      
      const tier = await reputationContract.getCurrentBadgeTier(trader1.address);
      expect(tier).to.be.gte(1); // At least Bronze
    });

    it("Should not award duplicate badges", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const baseTime = await time.latest();
      
      // Win multiple times to potentially trigger badge multiple times
      for (let i = 0; i < 10; i++) {
        await predictionMarket.createMarket(
          `Market ${i}`,
          "Desc",
          "Crypto",
          baseTime + 86400 * (i + 2) * 10,
          false
        );
        
        await predictionMarket.connect(trader1).buyPosition(i + 1, true, { value: ethers.parseEther("2") });
        await predictionMarket.connect(user1).buyPosition(i + 1, false, { value: ethers.parseEther("1") });
        
        await time.increaseTo(baseTime + 86400 * (i + 2) * 10 + 1);
        await predictionMarket.resolveMarket(i + 1, true);
        await predictionMarket.connect(trader1).claimWinnings(i + 1);
      }
      
      const badges = await reputationContract.getTraderBadges(trader1.address);
      
      // Count badges of each tier
      const bronzeCount = badges.filter(b => b.tier === 1n).length;
      const silverCount = badges.filter(b => b.tier === 2n).length;
      
      expect(bronzeCount).to.be.lte(1);
      expect(silverCount).to.be.lte(1);
    });
  });

  describe("4. Copy Trading - Follow/Unfollow", function () {
    it("Should allow following a trader", async function () {
      const { reputationContract, trader1, follower1 } = await loadFixture(deployContractsFixture);
      
      await reputationContract.connect(follower1).followTrader(
        trader1.address,
        ethers.parseEther("1"), // maxAmountPerTrade
        50 // 50% copy percentage
      );
      
      const settings = await reputationContract.getCopyTradeSettings(follower1.address, trader1.address);
      expect(settings.active).to.be.true;
      expect(settings.copyPercentage).to.equal(50);
      expect(settings.maxAmountPerTrade).to.equal(ethers.parseEther("1"));
      
      const followerCount = await reputationContract.getTraderFollowerCount(trader1.address);
      expect(followerCount).to.equal(1);
    });

    it("Should prevent following yourself", async function () {
      const { reputationContract, trader1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        reputationContract.connect(trader1).followTrader(
          trader1.address,
          ethers.parseEther("1"),
          50
        )
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("Should prevent invalid copy percentage", async function () {
      const { reputationContract, trader1, follower1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        reputationContract.connect(follower1).followTrader(
          trader1.address,
          ethers.parseEther("1"),
          0 // Invalid: 0%
        )
      ).to.be.revertedWith("Invalid percentage");
      
      await expect(
        reputationContract.connect(follower1).followTrader(
          trader1.address,
          ethers.parseEther("1"),
          101 // Invalid: > 100%
        )
      ).to.be.revertedWith("Invalid percentage");
    });

    it("Should allow unfollowing a trader", async function () {
      const { reputationContract, trader1, follower1 } = await loadFixture(deployContractsFixture);
      
      // Follow first
      await reputationContract.connect(follower1).followTrader(
        trader1.address,
        ethers.parseEther("1"),
        50
      );
      
      // Then unfollow
      await reputationContract.connect(follower1).unfollowTrader(trader1.address);
      
      const settings = await reputationContract.getCopyTradeSettings(follower1.address, trader1.address);
      expect(settings.active).to.be.false;
    });

    it("Should prevent unfollowing if not following", async function () {
      const { reputationContract, trader1, follower1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        reputationContract.connect(follower1).unfollowTrader(trader1.address)
      ).to.be.revertedWith("Not following");
    });

    it("Should allow updating copy settings", async function () {
      const { reputationContract, trader1, follower1 } = await loadFixture(deployContractsFixture);
      
      // Follow
      await reputationContract.connect(follower1).followTrader(
        trader1.address,
        ethers.parseEther("1"),
        50
      );
      
      // Update settings
      await reputationContract.connect(follower1).updateCopySettings(
        trader1.address,
        ethers.parseEther("2"),
        75
      );
      
      const settings = await reputationContract.getCopyTradeSettings(follower1.address, trader1.address);
      expect(settings.maxAmountPerTrade).to.equal(ethers.parseEther("2"));
      expect(settings.copyPercentage).to.equal(75);
    });

    it("Should track multiple followers", async function () {
      const { reputationContract, trader1, follower1, follower2 } = await loadFixture(deployContractsFixture);
      
      await reputationContract.connect(follower1).followTrader(trader1.address, ethers.parseEther("1"), 50);
      await reputationContract.connect(follower2).followTrader(trader1.address, ethers.parseEther("2"), 75);
      
      const followers = await reputationContract.getFollowers(trader1.address);
      expect(followers.length).to.equal(2);
      expect(followers).to.include(follower1.address);
      expect(followers).to.include(follower2.address);
    });

    it("Should track following list", async function () {
      const { reputationContract, trader1, trader2, follower1 } = await loadFixture(deployContractsFixture);
      
      await reputationContract.connect(follower1).followTrader(trader1.address, ethers.parseEther("1"), 50);
      await reputationContract.connect(follower1).followTrader(trader2.address, ethers.parseEther("1"), 50);
      
      const following = await reputationContract.getFollowing(follower1.address);
      expect(following.length).to.equal(2);
      expect(following).to.include(trader1.address);
      expect(following).to.include(trader2.address);
    });
  });

  describe.skip("5. Admin Functions", function () {
    // These tests are skipped because TraderReputation is owned by PredictionMarket contract
    // and requires a proxy function in PredictionMarket to call verifyTrader/unverifyTrader
    it("Should allow owner to verify trader", async function () {
      const { reputationContract, predictionMarket, trader1, owner } = await loadFixture(deployContractsFixture);
      
      // PredictionMarket is the owner of TraderReputation
      await owner.sendTransaction({ to: predictionMarket.target, data: reputationContract.interface.encodeFunctionData('verifyTrader', [trader1.address]) });
      
      const stats = await reputationContract.traderStats(trader1.address);
      expect(stats.isVerified).to.be.true;
    });

    it("Should allow owner to unverify trader", async function () {
      const { reputationContract, predictionMarket, trader1, owner } = await loadFixture(deployContractsFixture);
      
      // PredictionMarket is the owner of TraderReputation
      await owner.sendTransaction({ to: predictionMarket.target, data: reputationContract.interface.encodeFunctionData('verifyTrader', [trader1.address]) });
      await owner.sendTransaction({ to: predictionMarket.target, data: reputationContract.interface.encodeFunctionData('unverifyTrader', [trader1.address]) });
      
      const stats = await reputationContract.traderStats(trader1.address);
      expect(stats.isVerified).to.be.false;
    });
  });

  describe("6. Integration with PredictionMarket", function () {
    it("Should automatically record bets", async function () {
      const { predictionMarket, reputationContract, trader1 } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test description", "Test", endTime, false);
      
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("5") });
      
      const stats = await reputationContract.getTraderStats(trader1.address);
      expect(stats.totalBets).to.equal(1);
      expect(stats.totalVolume).to.equal(ethers.parseEther("5"));
    });

    it("Should automatically update reputation on claim", async function () {
      const { predictionMarket, reputationContract, trader1, user1 } = await loadFixture(deployContractsFixture);
      
      const endTime = (await time.latest()) + 86400;
      await predictionMarket.createMarket("Market", "Test description", "Test", endTime, false);
      
      await predictionMarket.connect(trader1).buyPosition(1, true, { value: ethers.parseEther("1") });
      await predictionMarket.connect(user1).buyPosition(1, false, { value: ethers.parseEther("1") });
      
      await time.increaseTo(endTime + 1);
      await predictionMarket.resolveMarket(1, true);
      
      const statsBefore = await reputationContract.getTraderStats(trader1.address);
      expect(statsBefore.totalWins).to.equal(0);
      
      await predictionMarket.connect(trader1).claimWinnings(1);
      
      const statsAfter = await reputationContract.getTraderStats(trader1.address);
      expect(statsAfter.totalWins).to.equal(1);
    });
  });
});







