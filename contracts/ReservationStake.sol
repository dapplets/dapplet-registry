// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

abstract contract ReservationStake is Ownable {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint8 internal constant _NO_STAKE = 0;
    uint8 internal constant _WAITING_FOR_REGULAR_DAPPLET = 1;
    uint8 internal constant _READY_TO_BURN = 2;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    struct Stake {
        uint256 amount;
        uint256 duration;
        uint256 endsAt;
    }

    mapping(string => Stake) public stakes;

    // Parameters modifiable by the contract owner
    address public stakingToken = address(0x0); // staking is disabled by default
    uint256 public period = 30 days; // 1 month by default
    uint256 public minDuration = 30 days; // 1 month by default
    uint256 public basePrice = 1e18; // 100 tokens (decimals = 16) by default
    uint256 public burnShare = 0.2e18; // 20% of tokens will be burned

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function calcStake(uint256 duration) public view returns (uint256) {
        require(duration >= minDuration, "Increase duration");

        uint256 price = basePrice;

        // It will fail if duration < minDuration
        duration -= minDuration;

        uint256 periods = duration / period;
        uint256 i = 0;
        for (; i < periods; i++) {
            price += (2 ** i) * basePrice;
        }

        // Add the leftover
        price += ((duration % period) * (2 ** i) * basePrice) / period;

        return price;
    }

    function calcExtendedStake(
        string memory name,
        uint256 secondsDuration
    ) public view returns (uint256) {
        uint256 d = stakes[name].duration;
        return calcStake(secondsDuration + d) - (d == 0 ? 0 : calcStake(d));
    }

    function getStakeStatus(string memory name) public view returns (uint8) {
        Stake memory stake = stakes[name];

        if (stake.endsAt == 0) {
            return _NO_STAKE; // 0
        } else if (stake.endsAt > block.timestamp) {
            return _WAITING_FOR_REGULAR_DAPPLET; // 1
        } else {
            return _READY_TO_BURN; // 2
        }
    }

    // -------------------------------------------------------------------------
    // State modifying functions
    // -------------------------------------------------------------------------

    function extendReservation(
        string memory name,
        uint256 reservationPeriod
    ) public {
        uint256 requiredAmount = calcExtendedStake(name, reservationPeriod);
        require(
            IERC20(stakingToken).transferFrom(
                msg.sender,
                address(this),
                requiredAmount
            ),
            "Token transfer failed"
        );

        Stake storage stake = stakes[name];

        if (stake.endsAt == 0) {
            stake.endsAt = block.timestamp;
        }

        stake.amount += requiredAmount;
        stake.duration += reservationPeriod;
        stake.endsAt += reservationPeriod;
    }

    function setStakeParameters(
        address _stakingToken,
        uint256 _period,
        uint256 _minDuration,
        uint256 _basePrice,
        uint256 _burnShare
    ) public onlyOwner {
        stakingToken = _stakingToken;
        period = _period;
        minDuration = _minDuration;
        basePrice = _basePrice;
        burnShare = _burnShare;
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    function _withdrawStake(string memory name, address recipient) public {
        Stake memory stake = stakes[name];
        require(stake.amount != 0, "Nothing to withdraw");
        require(
            IERC20(stakingToken).transfer(recipient, stake.amount),
            "Token transfer failed"
        );

        delete stakes[name];
    }

    function _burnStake(string memory name, address recipient) public {
        Stake memory stake = stakes[name];
        require(stake.amount != 0, "Nothing to withdraw");

        // uint256 tokensToBurn = Math.mulDiv(burnShare, stake.amount, 1e18);
        // uint256 tokensToReturn = stake.amount - tokensToBurn;

        // ToDo: burn via bonding curve

        // Return tokens to the burner
        require(
            IERC20(stakingToken).transfer(recipient, stake.amount),
            "Token transfer failed"
        );

        delete stakes[name];
    }

    function _isStakingActive() internal view returns (bool) {
        return stakingToken != address(0x0);
    }
}
