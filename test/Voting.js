const { expect } = require("chai");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Voting", function () {
    async function deployVoting() {
        const [owner, voter1, voter2, nonVoter] = await ethers.getSigners();
        const WorkflowStatus = {
            RegisteringVoters: 0,
            ProposalsRegistrationStarted: 1,
            ProposalsRegistrationEnded: 2,
            VotingSessionStarted: 3,
            VotingSessionEnded: 4,
            VotesTallied: 5,
        };
        const Voting = await ethers.getContractFactory("Voting");
        const voting = await Voting.deploy();

        return { voting, owner, voter1, voter2, nonVoter, WorkflowStatus };
    }

    describe("Registration", function () {
        it("Should set the right owner", async function () {
            const { voting, owner } = await loadFixture(deployVoting);
            expect(await voting.owner()).to.equal(owner.address);
        });

        it("Should register the owner as a voter", async function () {
            const { voting, owner } = await loadFixture(deployVoting);
            await expect(voting.addVoter(owner.address))
                .to.emit(voting, "VoterRegistered")
                .withArgs(owner.address);

            const voter = await voting.getVoter(owner.address);
            expect(voter.isRegistered).to.be.true;
        });

        it("Should register a voter by the owner", async function () {
            const { voting, owner, voter1 } = await loadFixture(deployVoting);
            await voting.addVoter(owner.address);
            await expect(voting.addVoter(voter1.address))
                .to.emit(voting, "VoterRegistered")
                .withArgs(voter1.address);

            const voter = await voting.getVoter(voter1.address);
            expect(voter.isRegistered).to.be.true;
        });

        it("Should not register a voter by a non-owner", async function () {
            const { voting, voter1, voter2 } = await loadFixture(deployVoting);
            await expect(voting.connect(voter1).addVoter(voter2.address)).to.be
                .reverted;
        });

        it("Should not register a voter when registration phase is over", async function () {
            const { voting, voter1 } = await loadFixture(deployVoting);
            await voting.startProposalsRegistering();
            await expect(voting.addVoter(voter1.address)).to.be.revertedWith(
                "Voters registration is not open yet"
            );
        });
    });

    describe("Proposals", function () {
        async function deployProposals() {
            const { voting, owner, voter1, voter2, nonVoter } =
                await loadFixture(deployVoting);
            await voting.addVoter(owner.address);
            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);
            await voting.startProposalsRegistering();
            return { voting, owner, voter1, voter2, nonVoter };
        }

        it("Should add a proposal by a registered voter", async function () {
            const { voting, voter1 } = await loadFixture(deployProposals);
            await expect(voting.connect(voter1).addProposal("Proposal 1"))
                .to.emit(voting, "ProposalRegistered")
                .withArgs(1);

            const proposal = await voting.getOneProposal(1);
            expect(proposal.description).to.equal("Proposal 1");
        });

        it("Should not add a proposal by a non-registered voter", async function () {
            const { voting, nonVoter } = await loadFixture(deployProposals);
            await expect(
                voting.connect(nonVoter).addProposal("Proposal 1")
            ).to.be.revertedWith("You're not a voter");
        });

        it("Should not add a proposal when the proposal registration phase is over", async function () {
            const { voting, voter1 } = await loadFixture(deployProposals);
            await voting.endProposalsRegistering();
            await expect(
                voting.connect(voter1).addProposal("Proposal 1")
            ).to.be.revertedWith("Proposals are not allowed yet");
        });

        it("Should not add an empty proposal", async function () {
            const { voting, voter1 } = await loadFixture(deployProposals);
            await expect(
                voting.connect(voter1).addProposal("")
            ).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
        });
    });

    describe("Voting", function () {
        async function deployVotingSession() {
            const { voting, owner, voter1, voter2, nonVoter } =
                await loadFixture(deployVoting);
            await voting.addVoter(owner.address);
            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.connect(voter2).addProposal("Proposal 2");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            return { voting, owner, voter1, voter2, nonVoter };
        }

        it("Should allow a registered voter to vote", async function () {
            const { voting, voter1 } = await loadFixture(deployVotingSession);
            await expect(voting.connect(voter1).setVote(1))
                .to.emit(voting, "Voted")
                .withArgs(voter1.address, 1);

            const voter = await voting.getVoter(voter1.address);
            expect(voter.hasVoted).to.be.true;
            expect(voter.votedProposalId).to.equal(1);
        });

        it("Should not allow a voter to vote twice", async function () {
            const { voting, voter1 } = await loadFixture(deployVotingSession);
            await voting.connect(voter1).setVote(1);
            await expect(voting.connect(voter1).setVote(2)).to.be.revertedWith(
                "You have already voted"
            );
        });

        it("Should not allow voting when the voting session is over", async function () {
            const { voting, voter1 } = await loadFixture(deployVotingSession);
            await voting.endVotingSession();
            await expect(voting.connect(voter1).setVote(1)).to.be.revertedWith(
                "Voting session havent started yet"
            );
        });

        it("Should not allow voting for a non-existent proposal", async function () {
            const { voting, voter1 } = await loadFixture(deployVotingSession);
            await expect(
                voting.connect(voter1).setVote(999)
            ).to.be.revertedWith("Proposal not found");
        });
    });

    describe("Tally Votes", function () {
        async function deployTallyVotes() {
            const { voting, owner, voter1, voter2, nonVoter, WorkflowStatus } =
                await loadFixture(deployVoting);
            await voting.addVoter(owner.address);
            await voting.addVoter(voter1.address);
            await voting.addVoter(voter2.address);
            await voting.startProposalsRegistering();
            await voting.connect(voter1).addProposal("Proposal 1");
            await voting.connect(voter2).addProposal("Proposal 2");
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await voting.connect(voter1).setVote(1);
            await voting.connect(voter2).setVote(1);
            return { voting, owner, voter1, voter2, nonVoter, WorkflowStatus };
        }

        it("Should tally votes and declare the winning proposal", async function () {
            const { voting, WorkflowStatus } = await loadFixture(
                deployTallyVotes
            );
            await voting.endVotingSession();
            await expect(voting.tallyVotes())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(
                    WorkflowStatus.VotingSessionEnded,
                    WorkflowStatus.VotesTallied
                );
            expect(await voting.winningProposalID()).to.equal(1);
        });

        it("Should not tally votes before voting session is ended", async function () {
            const { voting } = await loadFixture(deployTallyVotes);
            await expect(voting.tallyVotes()).to.be.revertedWith(
                "Current status is not voting session ended"
            );
        });
    });

    describe("Workflow Transitions", function () {
        async function deployWorkflow() {
            const { voting, WorkflowStatus } = await loadFixture(deployVoting);
            return { voting, WorkflowStatus };
        }

        it("Should start proposal registration", async function () {
            const { voting, WorkflowStatus } = await loadFixture(
                deployWorkflow
            );
            await expect(voting.startProposalsRegistering())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(
                    WorkflowStatus.RegisteringVoters,
                    WorkflowStatus.ProposalsRegistrationStarted
                );
            expect(await voting.workflowStatus()).to.equal(1);
        });

        it("Should end proposal registration", async function () {
            const { voting, WorkflowStatus } = await loadFixture(
                deployWorkflow
            );
            await voting.startProposalsRegistering();
            await expect(voting.endProposalsRegistering())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(
                    WorkflowStatus.ProposalsRegistrationStarted,
                    WorkflowStatus.ProposalsRegistrationEnded
                );
            expect(await voting.workflowStatus()).to.equal(2);
        });

        it("Should start voting session", async function () {
            const { voting, WorkflowStatus } = await loadFixture(
                deployWorkflow
            );
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await expect(voting.startVotingSession())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(
                    WorkflowStatus.ProposalsRegistrationEnded,
                    WorkflowStatus.VotingSessionStarted
                );
            expect(await voting.workflowStatus()).to.equal(3);
        });

        it("Should end voting session", async function () {
            const { voting, WorkflowStatus } = await loadFixture(
                deployWorkflow
            );
            await voting.startProposalsRegistering();
            await voting.endProposalsRegistering();
            await voting.startVotingSession();
            await expect(voting.endVotingSession())
                .to.emit(voting, "WorkflowStatusChange")
                .withArgs(
                    WorkflowStatus.VotingSessionStarted,
                    WorkflowStatus.VotingSessionEnded
                );
            expect(await voting.workflowStatus()).to.equal(4);
        });
    });
});
