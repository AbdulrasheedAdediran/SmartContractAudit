import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { MockGovToken } from "../typechain-types";

describe("MockGovToken Contract", () => {
  const MGGovTokenFixture = async () => {
    const [owner, account1, account2] = await ethers.getSigners();
    const MGGovTokenFactory = await ethers.getContractFactory("MockGovToken");
    const MGGovTokenContract: MockGovToken = await MGGovTokenFactory.deploy();
    await MGGovTokenContract.deployed();

    return { MGGovTokenContract, owner, account1, account2 };
  };

  describe("#mint()", () => {
    it("Should mint all tokens to owner and delegate votes to account1", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      const totalSupply = ethers.utils.parseEther("7500");
      await MGGovTokenContract.connect(owner).mint(owner.address, totalSupply);
      await MGGovTokenContract.connect(owner).delegate(account1.address);
      const account1CurrentVotes = await MGGovTokenContract.getCurrentVotes(
        account1.address
      );
      const ownerBalance = await MGGovTokenContract.balanceOf(owner.address);
      assert.equal(Number(ownerBalance), Number(totalSupply));
      assert.equal(Number(account1CurrentVotes), Number(totalSupply));
    });

    it("Should revert if sender is not owner", async () => {
      const { MGGovTokenContract, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      const totalSupply = ethers.utils.parseEther("7500");
      await expect(
        MGGovTokenContract.connect(account1).mint(account1.address, totalSupply)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("#burn()", () => {
    it("Should burn tokens and deduct delegate's votes of given address ", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      const totalSupply = ethers.utils.parseEther("7500");
      const amountToBurn = ethers.utils.parseEther("500");
      await MGGovTokenContract.connect(owner).mint(owner.address, totalSupply);
      await MGGovTokenContract.connect(owner).delegate(account1.address);
      await MGGovTokenContract.connect(owner).burn(owner.address, amountToBurn);
      const account1CurrentVotes = await MGGovTokenContract.getCurrentVotes(
        account1.address
      );
      const ownerBalance = await MGGovTokenContract.balanceOf(owner.address);
      assert.equal(
        Number(ownerBalance),
        Number(ethers.utils.parseEther("7000"))
      );
      assert.equal(
        Number(account1CurrentVotes),
        Number(ethers.utils.parseEther("7000"))
      );
    });

    it("Should revert if sender is not owner", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      const totalSupply = ethers.utils.parseEther("7500");
      const amountToBurn = ethers.utils.parseEther("500");
      await MGGovTokenContract.connect(owner).mint(owner.address, totalSupply);
      await MGGovTokenContract.connect(owner).delegate(account1.address);
      await expect(
        MGGovTokenContract.connect(account1).burn(owner.address, amountToBurn)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("#delegates()", () => {
    it("Should return delegatees of a given address", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      await MGGovTokenContract.connect(owner).delegate(account1.address);
      expect(await MGGovTokenContract.delegates(owner.address)).to.include(
        account1.address
      );
    });
  });

  describe("#getPriorVotes()", () => {
    it("Should revert if votes have not been determined at given block number", async () => {
      const { MGGovTokenContract, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      await expect(
        MGGovTokenContract.getPriorVotes(account1.address, 1)
      ).to.be.revertedWith("MGToken::getPriorVotes: not yet determined");
    });

    it("Should return prior votes of given address if the given block is valid", async () => {
      const { MGGovTokenContract, owner, account1, account2 } =
        await loadFixture(MGGovTokenFixture);
      const totalSupply = ethers.utils.parseEther("7500");
      await MGGovTokenContract.connect(owner).mint(owner.address, totalSupply);
      await MGGovTokenContract.connect(owner).delegate(account1.address);
      await MGGovTokenContract.connect(account1).delegate(account2.address);
      assert.equal(
        Number(await MGGovTokenContract.getPriorVotes(account1.address, 3)),
        Number(totalSupply)
      );
    });
  });

  describe("events", () => {
    it("Should emit `DelegateChanged` when an account changes its delegate", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      expect(await MGGovTokenContract.connect(owner).delegate(account1.address))
        .to.emit(MGGovTokenContract, "DelegateChanged")
        .withArgs(owner.address, anyValue, account1.address);
    });

    it("Should emit `DelegateVotesChanged` when a delegate account's vote balance changes", async () => {
      const { MGGovTokenContract, owner, account1 } = await loadFixture(
        MGGovTokenFixture
      );
      const totalSupply = ethers.utils.parseEther("7500");
      const account1OldVotes = MGGovTokenContract.getCurrentVotes(
        account1.address
      );
      await MGGovTokenContract.connect(owner).mint(owner.address, totalSupply);
      expect(await MGGovTokenContract.connect(owner).delegate(account1.address))
        .to.emit(MGGovTokenContract, "DelegateVotesChanged")
        .withArgs(
          account1.address,
          account1OldVotes,
          MGGovTokenContract.getCurrentVotes(account1.address)
        );
    });
  });
});
