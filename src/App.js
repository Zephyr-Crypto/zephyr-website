import './App.css';
import React, { useState, useRef, useEffect } from "react";
import useInterval from "./hooks/useInterval";
import ButtonBase from '@material-ui/core/ButtonBase';
import CircularProgress from '@material-ui/core/CircularProgress';
import swal from '@sweetalert/with-react';
import { ethers } from 'ethers';
import { FaTelegramPlane } from 'react-icons/fa';
import { FaGithub } from 'react-icons/fa';

import { YFKA_EXCHANGE, ZEPHYR_TOKEN } from './config/Web3Config';
import { REBASE_CONTROLLER } from './config/Web3Config';
import { STAKING_POOL } from './config/Web3Config';
import { UNISWAP_POOL } from './config/Web3Config';
import { YFKA_TOKEN } from './config/Web3Config';

import { REBASE_CONTROLLER_ADDRESS } from './config/Web3Config';
import { STAKING_POOL_ADDRESS } from './config/Web3Config';
import { UNISWAP_POOL_ADDRESS } from './config/Web3Config';
import { BTS_DISTRIBUTION_ADDRESS } from './config/Web3Config';
import { YFKA_TOKEN_ADDRESS } from './config/Web3Config';
import { YFKA_EXCHANGE_ADDRESS } from './config/Web3Config';

import { IERC20_ABI } from './abi/IERC20';
import { REBASE_CONTROLLER_ABI } from './abi/RebaseController';
import { BTS_DISTRIBUTION_ABI } from './abi/BtsDistribution';
import { STAKING_POOL_ABI } from './abi/StakingPool';
import { YFKA_EXCHANGE_ABI } from './abi/YfkaExchange';

import { BTS_PROOFS } from './config/bts-proofs';
import { BTS_ACCOUNTS } from './config/bts-accounts';

function App() {  

    //Component state (for async functions)
    const MOUNTED = useRef(true);
    useEffect(() => {
        return () => MOUNTED.current = false;
    }, []);

    // CLAIM ----------------------------------------------------------------------------------- //
    
    const [claimLoading, setClaimLoading] = useState(false);

    async function BTS_CHECK_CLAIMED() {
        
        if (window.ethereum) {
            try {

                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = new ethers.Contract(BTS_DISTRIBUTION_ADDRESS, BTS_DISTRIBUTION_ABI, signer);
    
                const address = (await signer.getAddress()).toString().toLowerCase();
                const index = BTS_ACCOUNTS.indexOf(address);

                if (index == -1) return true;
                return await contract.claimed(index);
    
            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            }
        }

    }
    
    async function BTS_CLAIM() {

        if (window.ethereum) {
            try {

                setClaimLoading(true);

                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = new ethers.Contract(BTS_DISTRIBUTION_ADDRESS, BTS_DISTRIBUTION_ABI, signer);
    
                const address = (await signer.getAddress()).toString().toLowerCase();
                const index = BTS_ACCOUNTS.indexOf(address);
                const proofs = BTS_PROOFS[index];
    
                const tx = await contract.claim(index, proofs);

                if (MOUNTED.current) swal({
                    className: "app__swal",
                    button: false,
                    content: <p>Your claim was submitted to the blockchain to be confirmed, so you should see the tokens in your wallet in a moment.  Awesome!  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                });

            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            } finally {
                setClaimLoading(false);
            }
        }

    }

    const claimZphrOnClick = async () => {
        
        if (!window.ethereum) {
            return swal({
                className: "app__swal",
                button: false,
                content: <p>You'll need Metamask in order to claim Zephyr tokens.  Get it at <a href="https://www.metamask.io/" target="_blank" rel="noreferrer">Metamask.io</a> and try again.</p>
            });
        }

        setClaimLoading(true);
        
        const claimed = await BTS_CHECK_CLAIMED();
        if (claimed) 
            return swal({
                className: "app__swal",
                button: false,
                content: <p>Sorry, but your address isn't eligible to claim tokens.</p>
            }).then(() => {
                setClaimLoading(false);
            });

        if (MOUNTED.current) BTS_CLAIM();

    }

    // REBASE ---------------------------------------------------------------------------------- //

    const [percentChange, setPercentChange] = useState();
    const [secondsUntilRebase, setSecondsUntilRebase] = useState();
    const [totalSupply, setTotalSupply] = useState();
    const [baseReward, setBaseReward] = useState();
    const [rewardMultiplier, setRewardMultiplier] = useState();

    //On Component Load
    useEffect(() => {

        (async () => {
            try {
                const lastRate = await REBASE_CONTROLLER._lastExchangeRate();
                const currentRate = await REBASE_CONTROLLER.getCurrentExchangeRate();
                const sign = currentRate > lastRate ? 1 : -1;
                const change = (sign * Math.abs(lastRate - currentRate) / lastRate * 100);
                if (MOUNTED.current) setPercentChange(change);
            } catch (e) {
                console.log(e);
            }
            
        })();

        (async () => {
            try {
                const seconds = await REBASE_CONTROLLER.secondsUntilRebase();
                if (MOUNTED.current) setSecondsUntilRebase(seconds);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const reward = await REBASE_CONTROLLER.getBaseReward();
                if (MOUNTED.current) setBaseReward(reward);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const multiplier = await REBASE_CONTROLLER._rewardMultiplier();
                if (MOUNTED.current) setRewardMultiplier(multiplier);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const supply = await ZEPHYR_TOKEN.totalSupply();
                if (MOUNTED.current) setTotalSupply(supply);
            } catch (e) {
                console.log(e);
            }
        })();

    }, []);

    useInterval(() => {
        if (secondsUntilRebase > 0) setSecondsUntilRebase(secondsUntilRebase.sub(1));
    }, 1000);

    async function REBASE() {
        
        if (window.ethereum) {
            try {
                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = new ethers.Contract(REBASE_CONTROLLER_ADDRESS, REBASE_CONTROLLER_ABI, signer);
                
                const tx = await contract.rebase();

                if (MOUNTED.current) swal({
                    className: "app__swal",
                    button: false,
                    content: <p>Your rebase transaction was submitted to the blockchain to be confirmed.  If you were the first person to call rebase, then you should see the reward tokens in your wallet soon.  Awesome!  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                });
                
            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            } 
        } else {
            return swal({
                className: "app__swal",
                button: false,
                content: <p>You'll need Metamask in order to call rebase on Zephyr.  Get it at <a href="https://www.metamask.io/" target="_blank" rel="noreferrer">Metamask.io</a> and try again.</p>
            });
        }
        
    }

    function displayTimeUntilNextRebase() {
        return new Date(secondsUntilRebase * 1000).toISOString().substr(11, 8);
    }

    const displayPercentChange = () => {
        if (percentChange || percentChange == 0) {
            let direction;
            if (percentChange == 0) direction = ""; else direction = percentChange > 0 ? "Increase" : "Decrease";
            return percentChange.toFixed(5) + "%" + " " + direction;
        } else {
            return "...";
        }
    }

    const displayTotalSupply = () => {
        if (totalSupply > 0) {
            const supply = Math.floor(totalSupply.div(10**9));
            return supply.toLocaleString();
        } else {
            return "...";
        }
    }

    const displayTotalSupplyAfterRebase = () => {
        if (totalSupply > 0 && percentChange !== undefined) {
            const supply = Math.floor(totalSupply.div(10**9));
            const change = () => {
                if (percentChange < -1) return -1;
                if (percentChange > 1) return 1;
                return percentChange;
            }
            const newSupply = Math.floor(supply + (supply * change() / 100));
            return newSupply.toLocaleString();
        } else {
            return "...";
        }
    }

    const displayBaseReward = () => {
        if (baseReward) {
            return (baseReward / 10**9).toFixed(5);
        } else {
            return "...";
        }
    }

    const displayMultiplier = () => {
        if (rewardMultiplier) {
            return rewardMultiplier + "x";
        } else {
            return "...";
        }
    }

    const displayTotalReward = () => {
        if (baseReward && rewardMultiplier) {
            return (baseReward / 10**9 * rewardMultiplier).toFixed(5);
        } else {
            return "...";
        }
    }

    const priceIncreaseColor = "#67E87F";
    const priceDecreaseColor = "#FF4B4B";
    const priceNeutralColor = "#92ACB8";
    const percentChangeColor = () => {
        if (percentChange > 0) return { color: priceIncreaseColor };
        if (percentChange < 0) return { color: priceDecreaseColor };
        return { color: priceNeutralColor };
    }

    // STAKING --------------------------------------------------------------------------------- //

    const [stakeLoading, setStakeLoading] = useState(false);
    const [stakeApproving, setStakeApproving] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState();
    const [stakingPoolBalance, setStakingPoolBalance] = useState();
    const [userUniV2Balance, setUserUniV2Balance] = useState();
    const [userAmountStaked, setUserAmountStaked] = useState();
    const [globalAmountStaked, setGlobalAmountStaked] = useState();
    const [userRewardsEarned, setUserRewardsEarned] = useState();

    //On Component Load
    useEffect(() => {

        (async () => {
            try {
                const seconds = await STAKING_POOL.secondsRemainingInPeriod();
                if (MOUNTED.current) setDaysRemaining(toDays(seconds));
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const balance = await ZEPHYR_TOKEN.balanceOf(STAKING_POOL_ADDRESS);
                if (MOUNTED.current) setStakingPoolBalance(balance.div(10**9));
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const staked = await STAKING_POOL.globalAmountStaked();
                if (MOUNTED.current) setGlobalAmountStaked(staked);
            } catch (e) {
                console.log(e);
            }
        })();

        //Data beyond this point requires metamask and a user account
        if (!window.ethereum) return;
        
        //If an account is already exposed, then use it
        (async () => {
            const accounts = await window.ethereum.request({method: "eth_accounts"});
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        })();

        //Listen for account changes and update the UI accordingly
        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        });

    }, []);

    async function STAKE() {
    
        const amount = document.getElementById("staking-amount").value;
        if (!amount) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>Enter an amount of UNI-V2 tokens to stake.</p>
            });
            return;
        }

        const baseUnits = big(ethers.utils.parseEther(amount));
        if (baseUnits.gt(userUniV2Balance)) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>The amount of UNI-V2 tokens you've entered exceeds your current balance.</p>
            });
            return;
        }

        setStakeLoading(true);
        setStakeApproving(true);

        //Make sure the pool is still running
        const seconds = await STAKING_POOL.secondsRemainingInPeriod();
        if (seconds.eq(0)) {
            return swal({
                className: "app__swal",
                button: false,
                content: 
                    <p>Sorry, but this staking pool has ended.  Please check back soon!</p>
            }).then(() => {
                setStakeLoading(false);
                setStakeApproving(false);
            });
        }
        
        //Make sure the pool isn't in an emergency state
        const emergency = await STAKING_POOL._emergency();
        if (emergency) {
            return swal({
                className: "app__swal",
                button: false,
                content: 
                    <p>This pool is in an emergency state, so staking has been disabled.  If you have UNI-V2 tokens in the pool, please unstake them.  Sorry for the inconvenience!</p>
            }).then(() => {
                setStakeLoading(false);
                setStakeApproving(false);
            });
        }
        
        if (window.ethereum) {
            try {
                
                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const ierc20 = new ethers.Contract(UNISWAP_POOL_ADDRESS, IERC20_ABI, signer);
                const contract = new ethers.Contract(STAKING_POOL_ADDRESS, STAKING_POOL_ABI, signer);
                const address = await signer.getAddress();
                
                //If allowance is already sufficient, then approval isn't necessary
                const allowance = await ierc20.allowance(address, STAKING_POOL_ADDRESS);
                if (!allowance.gte(baseUnits)) {
                    const approve = await ierc20.approve(STAKING_POOL_ADDRESS, baseUnits);
                    await approve.wait(1);
                    setStakeApproving(false);
                }
                
                //Stake the tokens with the contract and return a transaction ID
                if (MOUNTED.current) {
                    const tx = await contract.stake(baseUnits);
                    swal({
                        className: "app__swal",
                        button: false,
                        content: <p>Your stake was submitted to the blockchain to be confirmed, and you'll be earning rewards shortly.  Nice!  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                    });
                }

            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            } finally {
                setStakeLoading(false);
                setStakeApproving(false);
            }
        } else {
            return swal({
                className: "app__swal",
                button: false,
                content: <p>You'll need Metamask in order to stake liquidity.  Get it at <a href="https://www.metamask.io/" target="_blank" rel="noreferrer">Metamask.io</a> and try again.</p>
            }).then(() => {
                setStakeLoading(false);
                setStakeApproving(false);
            });
        }
    
    }
    
    async function UNSTAKE() {
        
        const amount = document.getElementById("staking-amount").value;
        if (!amount) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>Enter an amount of UNI-V2 tokens to unstake.</p>
            });
            return;
        }

        const baseUnits = big(ethers.utils.parseEther(amount));
        if (baseUnits.gt(userAmountStaked)) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>The amount of UNI-V2 tokens you've entered exceeds your currently staked balance.</p>
            });
            return;
        }

        setStakeLoading(true);
        
        if (window.ethereum) {
            try {
                
                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = new ethers.Contract(STAKING_POOL_ADDRESS, STAKING_POOL_ABI, signer);
                
                const emergency = await contract._emergency();

                if (MOUNTED.current && emergency) {

                    const tx = await contract.emergencyUnstake();
                    if (MOUNTED.current) swal({
                        className: "app__swal",
                        button: false,
                        content: 
                            <div>
                                <p>Your transaction was submitted to the blockchain to be confirmed.  You should be seeing your UNI-V2 tokens in your wallet soon.  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                                <p>Unfortunately, because the pool was forced to close due to the emergency state being activated, Zephyr rewards will not be distributed.  Sincerest apologies for any inconvenience this has caused!</p>
                            </div>
                    });

                } else {

                    const tx = await contract.unstake(baseUnits);
                    if (MOUNTED.current) swal({
                        className: "app__swal",
                        button: false,
                        content: 
                            <div>
                                <p>Your transaction was submitted to the blockchain to be confirmed.  You should be seeing both your UNI-V2 tokens and your Zephyr reward tokens in your wallet soon.  Sweet!  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                            </div>
                    });

                }


            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            } finally {
                setStakeLoading(false);
            }
        } else {
            return swal({
                className: "app__swal",
                button: false,
                content: <p>You'll need Metamask in order to unstake liquidity.  Get it at <a href="https://www.metamask.io/" target="_blank" rel="noreferrer">Metamask.io</a> and try again.</p>
            }).then(() => {
                setStakeLoading(false);
            });
        }
    
    }

    const displayUserOwnershipPercentage = () => {
        if (userAmountStaked && globalAmountStaked) {
            if (globalAmountStaked == 0) return "0.0";
            return (userAmountStaked / globalAmountStaked * 100).toFixed(5) + "%";
        }
        return "...";
    }

    const displayUserRewards = () => {
        if (!window.ethereum) return "...";
        if (userRewardsEarned == 0) return "0.0";
        if (userRewardsEarned > 0) return (userRewardsEarned / 10**9).toFixed(5);
        return "...";
    }

    const displayStakingPoolBalance = () => {
        return stakingPoolBalance ? Number(stakingPoolBalance).toLocaleString() : "...";
    }

    const displayGlobalStake = () => {
        return globalAmountStaked ? Number(globalAmountStaked / 10**18).toFixed(7) : "...";
    }

    const displayDaysRemaining = () => {
        return daysRemaining >= 0 ? daysRemaining + " Days Remaining" : "...";
    }

    const displayMaxStakeAmount = () => {
        return userUniV2Balance >= 0 ? ethers.utils.formatEther(userUniV2Balance.toString()) : "...";
    }

    const displayMaxUnstakeAmount = () => {
        return userAmountStaked >= 0 ? ethers.utils.formatEther(userAmountStaked.toString()) : "...";
    }

    const insertMaxStakeAmount = () => {
        if (userUniV2Balance) {
            document.getElementById("staking-amount").value = ethers.utils.formatEther(userUniV2Balance.toString());
        } else {
            document.getElementById("staking-amount").value = "0.0";
        }        
    }

    const insertMaxUnstakeAmount = () => {
        if (userUniV2Balance) {
            document.getElementById("staking-amount").value = ethers.utils.formatEther(userAmountStaked.toString());
        } else {
            document.getElementById("staking-amount").value = "0.0";
        }  
    }

    // EXCHANGE -------------------------------------------------------------------------------- //

    const [exchangeLoading, setExchangeLoading] = useState(false);
    const [exchangeApproving, setExchangeApproving] = useState(false);
    const [yfkaExchanged, setYfkaExchanged] = useState();
    const [yfkaExchangeLimit, setYfkaExchangeLimit] = useState();
    const [exchangeRewardsRemaining, setExchangeRewardsRemaining] = useState();
    const [userYfkaBalance, setUserYfkaBalance] = useState();
    const [userYfkaExchanged, setUserYfkaExchanged] = useState();
    const [userZphrRedeemed, setUserZphrRedeemed] = useState();
    const [yfkaExchangeRate, setYfkaExchangeRate] = useState();

    //On Component Load
    useEffect(() => {

        (async () => {
            try {
                const exchanged = await YFKA_TOKEN.balanceOf(YFKA_EXCHANGE_ADDRESS);
                if (MOUNTED.current) setYfkaExchanged(exchanged);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const limit = await YFKA_EXCHANGE._yfkaExchangeLimit();
                if (MOUNTED.current) setYfkaExchangeLimit(limit);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const rewards = await ZEPHYR_TOKEN.balanceOf(YFKA_EXCHANGE_ADDRESS);
                if (MOUNTED.current) setExchangeRewardsRemaining(rewards);
            } catch (e) {
                console.log(e);
            }
        })();

        (async () => {
            try {
                const rate = await YFKA_EXCHANGE.exchangeRate();
                if (MOUNTED.current) setYfkaExchangeRate(rate);
            } catch (e) {
                console.log(e);
            }
        })();

        //Data beyond this point requires metamask and a user account
        if (!window.ethereum) return;

        //If an account is already exposed, then use it
        (async () => {
            const accounts = await window.ethereum.request({method: "eth_accounts"});
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        })();

        //Listen for account changes and update the UI accordingly
        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        });

    }, []);

    async function EXCHANGE() {

        const amount = document.getElementById("exchange-amount").value;
        if (!amount) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>Enter an amount of YFKA tokens to exchange.</p>
            });
            return;
        }

        const baseUnits = big(ethers.utils.parseEther(amount));
        if (baseUnits.gt(userYfkaBalance)) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>The amount of YFKA tokens you've entered exceeds your current balance.</p>
            });
            return;
        }

        setExchangeLoading(true);
        setExchangeApproving(true);

        //Make sure the limit hasn't been reached
        if(yfkaExchanged.gte(yfkaExchangeLimit)) {
            return swal({
                className: "app__swal",
                button: false,
                content: 
                    <p>Sorry, but the YFKA exchange limit has been reached.</p>
            }).then(() => {
                setExchangeLoading(false);
                setExchangeApproving(false);
            });
        }

        if (window.ethereum) {
            try {

                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const ierc20 = new ethers.Contract(YFKA_TOKEN_ADDRESS, IERC20_ABI, signer);
                const contract = new ethers.Contract(YFKA_EXCHANGE_ADDRESS, YFKA_EXCHANGE_ABI, signer);
                const address = await signer.getAddress();

                //If allowance is already sufficient, then approval isn't necessary
                const allowance = await ierc20.allowance(address, YFKA_EXCHANGE_ADDRESS);
                if (!allowance.gte(baseUnits)) {
                    const approve = await ierc20.approve(YFKA_EXCHANGE_ADDRESS, baseUnits);
                    await approve.wait(1);
                    setStakeApproving(false);
                }

                //Exchange tokens with the contract and return a transaction ID
                if (MOUNTED.current) {
                    const tx = await contract.exchange(baseUnits);
                    swal({
                        className: "app__swal",
                        button: false,
                        content: <p>Your exchange was submitted to the blockchain to be confirmed, and you'll be receiving your Zephyr tokens shortly.  Nice!  You can check the transaction <a href={"https://kovan.etherscan.io/tx/" + tx.hash} target="_blank" rel="noreferrer">here</a>.</p>
                    });
                }

            } catch (e) {
                console.log("Couldn't get access to accounts");
                console.log(e);
            } finally {
                setExchangeLoading(false);
                setExchangeApproving(false);
            }
        } else {
            return swal({
                className: "app__swal",
                button: false,
                content: <p>You'll need Metamask in order to exchange YFKA.  Get it at <a href="https://www.metamask.io/" target="_blank" rel="noreferrer">Metamask.io</a> and try again.</p>
            }).then(() => {
                setExchangeLoading(false);
                setExchangeApproving(false);
            });
        }

    }

    const displayYfkaExchanged = () => {
        return yfkaExchanged >= 0 ? Number(yfkaExchanged / 10**9 / 10**9).toLocaleString() + " YFKA Exchanged" : "...";
    }

    const displayYfkaExchangeLimit = () => {
        return yfkaExchangeLimit >= 0 ? Number(yfkaExchangeLimit / 10**9 / 10**9).toLocaleString() : "...";
    }

    const displayExchangeRewardsRemaining = () => {
        return exchangeRewardsRemaining >= 0 ? Math.floor(Number(exchangeRewardsRemaining / 10**9)).toLocaleString() : "...";
    }

    const displayMaxExchangeAmount = () => {
        return userYfkaBalance >= 0 ? ethers.utils.formatEther(userYfkaBalance.toString()) : "...";
    }

    const displayYfkaExchangeRate = () => {
        return yfkaExchangeRate >= 0 ? Number(yfkaExchangeRate / 10**9).toLocaleString() : "...";
    }

    const displayUserYfkaExchanged = () => {
        return userYfkaExchanged >= 0 ? Number(userYfkaExchanged / 10**9 / 10**9).toLocaleString() : "...";
    }

    const displayUserZphrRedeemed = () => {
        return userZphrRedeemed >= 0 ? Number(userZphrRedeemed / 10**9).toLocaleString() : "...";
    }

    const insertMaxExchangeAmount = () => {
        if (userYfkaBalance) {
            document.getElementById("exchange-amount").value = ethers.utils.formatEther(userYfkaBalance.toString());
        } else {
            document.getElementById("exchange-amount").value = "0.0";
        }
    }

    function big(number) {
        return ethers.BigNumber.from(number);
    }

    function toDays(seconds) {
        return Math.floor(seconds / 86400);
    }

    async function onAccountChanged(address) {

        try {

            UNISWAP_POOL.balanceOf(address).then((res) => {
                if (MOUNTED.current) setUserUniV2Balance(res);
            });

            STAKING_POOL.amountStaked(address).then((res) => {
                if (MOUNTED.current) setUserAmountStaked(res);
            });

            STAKING_POOL.rewardsEarned(address).then((res) => {
                if (MOUNTED.current) setUserRewardsEarned(res);
            });

            YFKA_TOKEN.balanceOf(address).then((res) => {
                if (MOUNTED.current) setUserYfkaBalance(res);
            });

            YFKA_EXCHANGE.yfkaExchanged(address).then((res) => {
                if (MOUNTED.current) setUserYfkaExchanged(res);
            });

            YFKA_EXCHANGE.zphrRedeemed(address).then((res) => {
                if (MOUNTED.current) setUserZphrRedeemed(res);
            });

        } catch (e) {
            console.log(e);
        }

    }

    //Return the react element
    return (
        <div className="app">

            <section className="hero">

                <h1>Zephyr</h1>
                <p>A rebasing token dedicated to the BTS community</p>
                
                <div className="hero__button-wrapper">

                    <ButtonBase
                        disabled={claimLoading}
                        onClick={claimZphrOnClick}>

                        {!claimLoading && "Claim ZPHR"}
                        {claimLoading && "Checking Claim..."}
                        {claimLoading && <CircularProgress size={16} color="inherit" />}
                    
                    </ButtonBase>

                    <ButtonBase>
                        <a href="https://app.uniswap.org/#/swap?outputCurrency=0x6C4d9837A8e983Bd3444cfE171AF9e8aeC685A45" target="_blank" rel="noreferrer">Buy ZPHR</a>
                    </ButtonBase>

                </div>

            </section>

            <section className="activities">

                <div className="activities__wrapper">

                    <div className="activity">

                        <div className="activity__description">
                            <h1>Rebase</h1>
                            <p>Once every 23 hours, the supply of Zephyr can be readjusted based on the token's percent change in price, up to a maximum of 1% in either positive or negative direction.  Be the person to call rebase and earn Zephyr.  Consecutive positive rebases will result in a bonus to rewards, all the way up to 100x.</p>
                        </div>

                        <div className="activity__statistics activity__rebase">
                            <h1>{displayPercentChange()}</h1>
                            <p>Current Supply: {displayTotalSupply()}</p>
                            <p>Rebased Supply: {displayTotalSupplyAfterRebase()}</p>
                            <p>Base Reward: {displayBaseReward()}</p>
                            <p>Multiplier: {displayMultiplier()}</p>
                            <p>Total Reward: {displayTotalReward()}</p>
                            <ButtonBase
                                onClick={REBASE} 
                                disabled={!secondsUntilRebase || secondsUntilRebase > 0}>
                                    {!secondsUntilRebase && "Checking status..."}
                                    {secondsUntilRebase == 0 && "Rebase & Earn"}
                                    {secondsUntilRebase > 0 && displayTimeUntilNextRebase()}
                            </ButtonBase>
                        </div>

                    </div>

                    <div className="activity">

                        <div className="activity__description">
                            <h1>Stake</h1>
                            <p>Provide liquidity on Uniswap, then stake your UNI-V2 tokens to earn Zephyr.  Rewards are distributed according to your percentage ownership of the pool and the amount of time staked.  Redeem your rewards at any time.  A large portion of Zephyr's supply will be distributed as staking rewards.</p>
                        </div>

                        <div className="activity__statistics activity__stake">

                            <h1>{displayDaysRemaining()}</h1>
                            <p>Rewards Available: {displayStakingPoolBalance()}</p>
                            <p>Global Stake: {displayGlobalStake()}</p>
                            <p>Your Ownership: {displayUserOwnershipPercentage()}</p>
                            <p>Your Rewards: {displayUserRewards()}</p>
                            <input placeholder="UNI-V2 Amount..." type="number" id="staking-amount"></input>
                            <div className="activity__stake-button">
                                <ButtonBase
                                    disabled={stakeLoading}
                                    onClick={STAKE}>
                                        {!stakeLoading && "Stake & Earn"}
                                        {stakeApproving && "Approving..."}
                                        {stakeLoading && !stakeApproving && "Stake & Earn..."}
                                        {(stakeApproving || stakeLoading) && <CircularProgress size={16} color="inherit" />}
                                </ButtonBase>
                                <p><span onClick={insertMaxStakeAmount}>Max: {displayMaxStakeAmount()}</span></p>
                            </div>
                            <div className="activity__unstake-button">
                                <ButtonBase
                                    disabled={stakeLoading}
                                    onClick={UNSTAKE}>
                                        {!stakeLoading && "Unstake & Redeem"}
                                        {stakeLoading && "Unstake & Redeem..."}
                                        {stakeLoading && <CircularProgress size={16} color="inherit" />}
                                </ButtonBase>
                                <p><span onClick={insertMaxUnstakeAmount}>Max: {displayMaxUnstakeAmount()}</span></p>
                            </div>

                        </div>

                    </div>

                    <div className="activity">

                        <div className="activity__description">
                            <h1>Exchange</h1>
                            <p>A minimum of 10% of Zephyr's total supply will be distributed through YFKA Exchange.  If you locked in a high yield rate as a YFKA farmer, this is your chance to take advantage of it.  Keep farming and exchanging for as long as there remains Zephyr available in the pool.</p>
                        </div>

                        <div className="activity__statistics activity__exchange">
                            <h1>{displayYfkaExchanged()}</h1>
                            <p>YFKA Limit: {displayYfkaExchangeLimit()}</p>
                            <p>ZPHR Available: {displayExchangeRewardsRemaining()}</p>
                            <p>Exchange Rate: {displayYfkaExchangeRate()}</p>
                            <p>Your YFKA Exchanged: {displayUserYfkaExchanged()}</p>
                            <p>Your ZPHR Redeemed: {displayUserZphrRedeemed()}</p>
                            <input placeholder="YFKA Amount..." type="number" id="exchange-amount"></input>
                            
                            <div className="activity__exchange-button">
                                <ButtonBase
                                    disabled={exchangeLoading}
                                    onClick={EXCHANGE}>
                                        {!exchangeLoading && "Exchange YFKA"}
                                        {exchangeApproving && "Approving..."}
                                        {exchangeLoading && !exchangeApproving && "Exchange YFKA..."}
                                        {(exchangeApproving || exchangeLoading) && <CircularProgress size={16} color="inherit" />}
                                </ButtonBase>    
                                <p><span onClick={insertMaxExchangeAmount}>Max: {displayMaxExchangeAmount()}</span></p>
                            </div>
                        </div>

                    </div>

                </div>

            </section>

            <section className="contracts">
                <div className="activity">

                    <div className="activity__description">
                        <h1>Contracts</h1>
                        <p>All contracts related to Zephyr have been carefully reviewed and tested, but they have not been professionally audited.  Please look over the contracts for yourself before deciding to purchase Zephyr tokens, and always invest your hard-earned money responsibly.</p>
                    </div>

                    <div className="activity__statistics activity__contracts">
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/Zephyr.sol" target="_blank" rel="noreferrer">Zephyr Token</a>
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/RebaseController.sol" target="_blank" rel="noreferrer">Rebase Controller</a>
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/UniswapRates.sol" target="_blank" rel="noreferrer">Uniswap Rates</a>
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/Distribution.sol" target="_blank" rel="noreferrer">BTS Distribution</a>
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/StakingPool.sol" target="_blank" rel="noreferrer">Staking Pool</a>
                        <a href="https://github.com/Zephyr-Crypto/zephyr-contracts/blob/master/contracts/YfkaExchange.sol" target="_blank" rel="noreferrer">YFKA Exchange</a>
                    </div>

                </div>
            </section>

            <section className="footer">

                <div className="footer__github-link">
                    <ButtonBase>
                        <a href="https://github.com/Zephyr-Crypto" target="_blank" rel="noreferrer"><FaGithub size={26} /></a>
                    </ButtonBase>
                </div>
                <div className="footer__telegram-link">
                    <ButtonBase>
                        <a href="https://t.me/zephyrcommunity" target="_blank" rel="noreferrer"><FaTelegramPlane size={26} /></a>
                    </ButtonBase>
                </div>

            </section>

        </div>
    );
}

export default App;
