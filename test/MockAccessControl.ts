import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { Minion, AttackMinion } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Minion Contract", () => {
  let minionContract: Minion,
    owner: SignerWithAddress,
    account1: SignerWithAddress;
  beforeEach(async () => {
    const [admin, signer1] = await ethers.getSigners();
    owner = admin;
    account1 = signer1;
    const MACFactory = await ethers.getContractFactory("Minion");
    minionContract = await MACFactory.deploy();
    await minionContract.deployed();
  });

  describe("#pwn()", () => {
    it("Should revert with error when called with an EOA", async () => {
      await expect(
        minionContract
          .connect(owner)
          .pwn({ value: ethers.utils.parseEther("0.1") })
      ).to.be.revertedWith("Well we are not allowing EOAs, sorry");
    });

    it("Should pass when called from a contract's constructor", async () => {
      const perfectTime = Number(await minionContract.timeVal()) + 10;
      await time.increaseTo(perfectTime);
      const attackMinionFactory = await ethers.getContractFactory(
        "AttackMinion"
      );
      const attackMinion: AttackMinion = await attackMinionFactory.deploy(
        minionContract.address,
        { value: ethers.utils.parseEther("1") }
      );
      await attackMinion.deployed();
      assert.equal(await minionContract.verify(attackMinion.address), true);
    });
  });

  describe("#retrieve()", () => {
    it("Should revert with error if sender is not owner", async () => {
      await expect(
        minionContract.connect(account1).retrieve()
      ).to.be.revertedWith("Are you the owner?");
    });
    it("Should revert with error if sender has no contribution", async () => {
      await expect(minionContract.connect(owner).retrieve()).to.be.revertedWith(
        "No balance, you greedy hooman"
      );
    });
    it("Should let owner retrieve contributions if balance is > 0", async () => {
      const perfectTime = Number(await minionContract.timeVal()) + 10;
      await time.increaseTo(perfectTime);
      const attackMinionFactory = await ethers.getContractFactory(
        "AttackMinion"
      );
      const attackMinion: AttackMinion = await attackMinionFactory.deploy(
        minionContract.address,
        { value: ethers.utils.parseEther("1") }
      );
      await attackMinion.deployed();

      expect(
        await minionContract.connect(owner).retrieve()
      ).to.changeEtherBalance(owner.address, ethers.utils.parseEther("0.2"));
    });
  });
});
