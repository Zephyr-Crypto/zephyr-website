import './App.css';
import React, { useState, useRef, useEffect } from "react";
import { ethers } from 'ethers';
import useInterval from "./hooks/useInterval";
import ButtonBase from '@material-ui/core/ButtonBase';
import CircularProgress from '@material-ui/core/CircularProgress';
import Switch from '@material-ui/core/Switch';
import swal from '@sweetalert/with-react';
import { FaTelegramPlane } from 'react-icons/fa';
import { FaGithub } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";

import { IERC20_ABI } from './abi/IERC20';
import { REBASE_CONTROLLER_ABI } from './abi/RebaseController';
import { DISTRIBUTION_ABI } from './abi/Distribution';
import { STAKING_POOL_ABI } from './abi/StakingPool';
import { YFKA_EXCHANGE_ABI } from './abi/YfkaExchange';

import { BTS_PROOFS } from './bts/bts-proofs';
import { BTS_ACCOUNTS } from './bts/bts-accounts';

function App() {  

    const [claimLoading, setClaimLoading] = useState(false);

    // const [blockchainSwitchState, setBlockchainSwitchState] = useState(false);

    const [percentChange, setPercentChange] = useState();
    const [secondsUntilRebase, setSecondsUntilRebase] = useState();
    const [totalSupply, setTotalSupply] = useState();
    const [baseReward, setBaseReward] = useState();
    const [rewardMultiplier, setRewardMultiplier] = useState();

    const [stakeLoading, setStakeLoading] = useState(false);
    const [stakeApproving, setStakeApproving] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState();
    const [stakingPoolBalance, setStakingPoolBalance] = useState();
    const [userUniV2Balance, setUserUniV2Balance] = useState();
    const [userAmountStaked, setUserAmountStaked] = useState();
    const [globalAmountStaked, setGlobalAmountStaked] = useState();
    const [userRewardsEarned, setUserRewardsEarned] = useState();

    const [exchangeLoading, setExchangeLoading] = useState(false);
    const [exchangeApproving, setExchangeApproving] = useState(false);
    const [yfkaExchanged, setYfkaExchanged] = useState();
    const [yfkaExchangeLimit, setYfkaExchangeLimit] = useState();
    const [exchangeRewardsRemaining, setExchangeRewardsRemaining] = useState();
    const [userYfkaBalance, setUserYfkaBalance] = useState();
    const [userYfkaExchanged, setUserYfkaExchanged] = useState();
    const [userZphrRedeemed, setUserZphrRedeemed] = useState();
    const [yfkaExchangeRate, setYfkaExchangeRate] = useState();

    //Component state (for async functions)
    const MOUNTED = useRef(true);
    useEffect(() => {
        return () => MOUNTED.current = false;
    }, []);

    //Countdown timer on rebase button
    useInterval(() => {
        if (secondsUntilRebase > 0) setSecondsUntilRebase(secondsUntilRebase.sub(1));
    }, 1000);


    // COMPONENT LOAD
    ///////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => {

        //Network ID to use if Metamask isn't present
        const network = 42;

        //If Metamask isn't present, then just go with Eth
        if (!window.ethereum) return onNetworkChanged(network);

        //If a network is already exposed, then use it
        if (window.ethereum.networkVersion) {
            onNetworkChanged(window.ethereum.networkVersion);
        } else {
            onNetworkChanged(network);
        }

        //If an account is already exposed, then use it
        (async () => {
            const accounts = await window.ethereum.request({method: "eth_accounts"});
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        })();

        //Listen for network changes and update the UI accordingly
        window.ethereum.on('chainChanged', (chainId) => {
            onNetworkChanged(parseInt(chainId));
        });

        //Listen for account changes and update the UI accordingly
        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) onAccountChanged(accounts[0]);
        });

    }, []);

    const networkId = useRef();
    const web3Provider = useRef();
    const account = useRef();

    //When the network changes, reload data from the blockchain
    //https://chainid.network/
    function onNetworkChanged(id) {

        networkId.current = id;
        web3Provider.current = getWeb3Provider(id);
        setContractAddresses(id);
        // setBlockchainSwitchState(usingBinance(id));

        updateGenericBlockchainData();
        
        if (ref(account)) updateUserSpecificBlockchainData();

    }

    function updateGenericBlockchainData() {

        _setPercentChange();
        _setSecondsUntilRebase();
        _setBaseReward();
        _setRewardMultiplier();
        _setTotalSupply();
        _setDaysRemaining();
        _setStakingPoolBalance();
        _setGlobalAmountStaked();
        _setYfkaExchanged();
        _setYfkaExchangeLimit();
        _setExchangeRewardsRemaining();
        _setYfkaExchangeRate();

    }

    //Creates an ethers.js provider for the given network ID
    function getWeb3Provider(id = ref(networkId)) {

        //BSC Mainnet
        if (id == 56) return new ethers.providers.JsonRpcProvider("https://bsc-dataseed1.binance.org:443");
        
        //BSC Testnet
        if (id == 97) return new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");

        return (
            ethers.getDefaultProvider(Number(id), {
                alchemy: process.env.REACT_APP_ALCHEMY_PROJECT_ID,
                infura: process.env.REACT_APP_INFURA_PROJECT_ID,
                etherscan: process.env.REACT_APP_ETHERSCAN_PROJECT_ID
            })
        );

    }

    function usingEthereum(id = ref(networkId)) {
        return id == 1 || id == 42;
    }

    function usingBinance(id = ref(networkId)) {
        return id == 56 || id == 97;
    }

    //When the account changes, reload data from the blockchain
    function onAccountChanged(acc) {

        account.current = acc;
        updateUserSpecificBlockchainData();

    }

    function updateUserSpecificBlockchainData() {

        _setUserUniV2Balance();
        _setUserAmountStaked();
        _setUserRewardsEarned();
        _setUserYfkaBalance();
        _setUserYfkaExchanged();
        _setUserZphrRedeemed();

    }


    // CONTRACTS
    ///////////////////////////////////////////////////////////////////////////////////////////////

    const zephyrTokenAddress = useRef();
    const rebaseControllerAddress = useRef();
    const distributionAddress = useRef();
    const uniswapPoolAddress = useRef();
    const stakingPoolAddress = useRef();
    const yfkaTokenAddress = useRef();
    const yfkaExchangeAddress = useRef();

    function setContractAddresses(id = ref(networkId)) {

        //Kovan
        if (id == 42) {
            zephyrTokenAddress.current = "0x8f3c40ba8e2f970fE5980118d5dBE0995A03072B";
            rebaseControllerAddress.current = "0x986f30b887390beE1625B22797265EF38c4F3D9A";
            distributionAddress.current = "0x7D9b87d8986bd909BD30a7aA95AB708d4D1d846D";
            uniswapPoolAddress.current = "0x3F66c663c7c1d802bF3A6503bcf3e13B0ef49C28";
            stakingPoolAddress.current = "0x6150e70A0d67d878d362778a8491468B3976b260";
            yfkaTokenAddress.current = "0x109027756a6140373262A5063199d2f79643EE88";
            yfkaExchangeAddress.current = "0xA9580277C1fCBbb7BE23D28B1d73415034a34A7B";
        }

        //BSC Testnet
        if (id == 97) {
            zephyrTokenAddress.current = undefined;
            rebaseControllerAddress.current = undefined;
            distributionAddress.current = undefined;
            uniswapPoolAddress.current = undefined;
            stakingPoolAddress.current = undefined;
            yfkaTokenAddress.current = undefined;
            yfkaExchangeAddress.current = undefined;
        }

    }

    function getZephyrToken(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(zephyrTokenAddress), IERC20_ABI, signer);
    }

    function getRebaseController(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(rebaseControllerAddress), REBASE_CONTROLLER_ABI, signer);
    }

    function getDistribution(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(distributionAddress), DISTRIBUTION_ABI, signer);
    }

    function getUniswapPool(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(uniswapPoolAddress), IERC20_ABI, signer);
    }

    function getStakingPool(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(stakingPoolAddress), STAKING_POOL_ABI, signer);
    }

    function getYfkaToken(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(yfkaTokenAddress), IERC20_ABI, signer);
    }

    function getYfkaExchange(signer = ref(web3Provider)) {
        return new ethers.Contract(ref(yfkaExchangeAddress), YFKA_EXCHANGE_ABI, signer);
    }


    // GENERIC BLOCKCHAIN DATA
    ///////////////////////////////////////////////////////////////////////////////////////////////

    async function _setPercentChange() {

        if (!ref(zephyrTokenAddress)) return setPercentChange(undefined);
        if (!ref(rebaseControllerAddress)) return setPercentChange(undefined);

        try {
            const contract = getRebaseController();
            const lastRate = await contract._lastExchangeRate();
            const currentRate = await contract.getCurrentExchangeRate();
            const sign = currentRate > lastRate ? 1 : -1;
            const change = (sign * Math.abs(lastRate - currentRate) / lastRate * 100);
            if (ref(MOUNTED)) setPercentChange(change);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setSecondsUntilRebase() {

        if (!ref(rebaseControllerAddress)) return setSecondsUntilRebase(undefined);

        try {
            const seconds = await getRebaseController().secondsUntilRebase();
            if (ref(MOUNTED)) setSecondsUntilRebase(seconds);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setBaseReward() {

        if (!ref(rebaseControllerAddress)) return setBaseReward(undefined);

        try {
            const reward = await getRebaseController().getBaseReward();
            if (ref(MOUNTED)) setBaseReward(reward);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setRewardMultiplier() {

        if (!ref(rebaseControllerAddress)) return setRewardMultiplier(undefined);

        try {
            const multiplier = await getRebaseController()._rewardMultiplier();
            if (ref(MOUNTED)) setRewardMultiplier(multiplier);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setTotalSupply() {

        if (!ref(zephyrTokenAddress)) return setTotalSupply(undefined);

        try {
            const supply = await getZephyrToken().totalSupply();
            if (ref(MOUNTED)) setTotalSupply(supply);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setDaysRemaining() {

        if (!ref(stakingPoolAddress)) return setDaysRemaining(undefined);

        try {
            const seconds = await getStakingPool().secondsRemainingInPeriod();
            if (ref(MOUNTED)) setDaysRemaining(toDays(seconds));
        } catch (e) {
            console.log(e);
        }

    }

    async function _setStakingPoolBalance() {

        if (!ref(zephyrTokenAddress)) return setStakingPoolBalance(undefined);
        if (!ref(stakingPoolAddress)) return setStakingPoolBalance(undefined);

        try {
            const balance = await getZephyrToken().balanceOf(ref(stakingPoolAddress));
            if (ref(MOUNTED)) setStakingPoolBalance(balance.div(10**9));
        } catch (e) {
            console.log(e);
        }

    }

    async function _setGlobalAmountStaked() {

        if (!ref(stakingPoolAddress)) return setGlobalAmountStaked(undefined);

        try {
            const staked = await getStakingPool().globalAmountStaked();
            if (ref(MOUNTED)) setGlobalAmountStaked(staked);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setYfkaExchanged() {

        if (!ref(yfkaTokenAddress)) return setYfkaExchanged(undefined);
        if (!ref(yfkaExchangeAddress)) return setYfkaExchanged(undefined);

        try {
            const exchanged = await getYfkaToken().balanceOf(ref(yfkaExchangeAddress));
            if (ref(MOUNTED)) setYfkaExchanged(exchanged);

        } catch (e) {
            console.log(e);
        }

    }

    async function _setYfkaExchangeLimit() {

        if (!ref(yfkaExchangeAddress)) return setYfkaExchangeLimit(undefined);

        try {
            const limit = await getYfkaExchange()._yfkaExchangeLimit();
            if (ref(MOUNTED)) setYfkaExchangeLimit(limit);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setExchangeRewardsRemaining() {

        if (!ref(zephyrTokenAddress)) return setExchangeRewardsRemaining(undefined);
        if (!ref(yfkaExchangeAddress)) return setExchangeRewardsRemaining(undefined);

        try {
            const rewards = await getZephyrToken().balanceOf(ref(yfkaExchangeAddress));
            if (ref(MOUNTED)) setExchangeRewardsRemaining(rewards);
        } catch (e) {            
            console.log(e);
        }

    }

    async function _setYfkaExchangeRate() {

        if (!ref(yfkaExchangeAddress)) return setYfkaExchangeRate(undefined);

        try {
            const rate = await getYfkaExchange().exchangeRate();
            if (ref(MOUNTED)) setYfkaExchangeRate(rate);
        } catch (e) {
            console.log(e);
        }

    }


    // USER-SPECIFIC BLOCKCHAIN DATA
    ///////////////////////////////////////////////////////////////////////////////////////////////

    //This also serves as the PancakePair balance
    async function _setUserUniV2Balance() {

        if (!ref(account)) return setUserUniV2Balance(undefined);
        if (!ref(uniswapPoolAddress)) return setUserUniV2Balance(undefined);

        try {
            const balance = await getUniswapPool().balanceOf(ref(account));
            if (ref(MOUNTED)) setUserUniV2Balance(balance);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setUserAmountStaked() {

        if (!ref(account)) return setUserAmountStaked(undefined);
        if (!ref(stakingPoolAddress)) return setUserAmountStaked(undefined);

        try {
            const amount = await getStakingPool().amountStaked(ref(account));
            if (ref(MOUNTED)) setUserAmountStaked(amount);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setUserRewardsEarned() {

        if (!ref(account)) return  setUserRewardsEarned(undefined);
        if (!ref(stakingPoolAddress)) return setUserRewardsEarned(undefined);

        try {
            const rewards = await getStakingPool().rewardsEarned(ref(account));
            if (ref(MOUNTED)) setUserRewardsEarned(rewards);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setUserYfkaBalance() {

        if (!ref(account)) return setUserYfkaBalance(undefined);
        if (!ref(yfkaTokenAddress)) return setUserYfkaBalance(undefined);

        try {
            const balance = await getYfkaToken().balanceOf(ref(account));
            if (ref(MOUNTED)) setUserYfkaBalance(balance);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setUserYfkaExchanged() {

        if (!ref(account)) return setUserYfkaExchanged(undefined);
        if (!ref(yfkaExchangeAddress)) return setUserYfkaExchanged(undefined);

        try {
            const amount = await getYfkaExchange().yfkaExchanged(ref(account));
            if (ref(MOUNTED)) setUserYfkaExchanged(amount);
        } catch (e) {
            console.log(e);
        }

    }

    async function _setUserZphrRedeemed() {

        if (!ref(account)) return setUserZphrRedeemed(undefined);
        if (!ref(yfkaExchangeAddress)) return setUserZphrRedeemed(undefined);

        try {
            const amount = await getYfkaExchange().zphrRedeemed(ref(account));
            if (ref(MOUNTED)) setUserZphrRedeemed(amount);
        } catch (e) {
            console.log(e);
        }

    }


    // CONTRACT INTERACTIONS
    ///////////////////////////////////////////////////////////////////////////////////////////////
    
    async function BTS_CHECK_CLAIMED() {
        
        if (window.ethereum) {
            try {

                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = getDistribution(signer);
    
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
                const contract = getDistribution(signer);
    
                const address = (await signer.getAddress()).toString().toLowerCase();
                const index = BTS_ACCOUNTS.indexOf(address);
                const proofs = BTS_PROOFS[index];
    
                const tx = await contract.claim(index, proofs);

                if (ref(MOUNTED)) swal({
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

    async function REBASE() {
        
        if (window.ethereum) {
            try {
                await window.ethereum.enable();
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = getRebaseController(signer);
                
                const tx = await contract.rebase();

                if (ref(MOUNTED)) swal({
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
        const seconds = await getStakingPool().secondsRemainingInPeriod();
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
        const emergency = await getStakingPool()._emergency();
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
                const ierc20 = getUniswapPool(signer);
                const contract = getStakingPool(signer);
                const address = await signer.getAddress();
                
                //If allowance is already sufficient, then approval isn't necessary
                const allowance = await ierc20.allowance(address, ref(stakingPoolAddress));
                if (!allowance.gte(baseUnits)) {
                    const approve = await ierc20.approve(ref(stakingPoolAddress), baseUnits);
                    await approve.wait(1);
                    setStakeApproving(false);
                }
                
                //Stake the tokens with the contract and return a transaction ID
                if (ref(MOUNTED)) {
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
                const contract = getStakingPool(signer);
                
                const emergency = await contract._emergency();

                if (ref(MOUNTED) && emergency) {

                    const tx = await contract.emergencyUnstake();
                    if (ref(MOUNTED)) swal({
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
                    if (ref(MOUNTED)) swal({
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

    async function EXCHANGE() {

        if (!usingEthereum()) {
            swal({
                className: "app__swal",
                button: false,
                content: 
                <p>Sorry, but YFKA Exchange is only available on Ethereum.</p>
            });
            return;
        }

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
                const ierc20 = getYfkaToken(signer);
                const contract = getYfkaExchange(signer);
                const address = await signer.getAddress();

                //If allowance is already sufficient, then approval isn't necessary
                const allowance = await ierc20.allowance(address, ref(yfkaExchangeAddress));
                if (!allowance.gte(baseUnits)) {
                    const approve = await ierc20.approve(ref(yfkaExchangeAddress), baseUnits);
                    await approve.wait(1);
                    setStakeApproving(false);
                }

                //Exchange tokens with the contract and return a transaction ID
                if (ref(MOUNTED)) {
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


    // CLICK HANDLERS
    ///////////////////////////////////////////////////////////////////////////////////////////////

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

        if (ref(MOUNTED)) BTS_CLAIM();

    }

    const maxStakeOnClick = () => {
        if (userUniV2Balance) {
            document.getElementById("staking-amount").value = ethers.utils.formatEther(userUniV2Balance.toString());
        } else {
            document.getElementById("staking-amount").value = "0.0";
        }        
    }

    const maxUnstakeOnClick = () => {
        if (userUniV2Balance) {
            document.getElementById("staking-amount").value = ethers.utils.formatEther(userAmountStaked.toString());
        } else {
            document.getElementById("staking-amount").value = "0.0";
        }  
    }

    const maxExchangeOnClick = () => {
        if (userYfkaBalance) {
            document.getElementById("exchange-amount").value = ethers.utils.formatEther(userYfkaBalance.toString());
        } else {
            document.getElementById("exchange-amount").value = "0.0";
        }
    }

    const refreshDataOnClick = () => {
        window.location.reload();
    }

    // const blockchainSwitchOnClick = (event) => {
    //     // setBlockchainSwitchState(event.target.checked);
    // }


    // DISPLAY ELEMENTS
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function displayTimeUntilNextRebase() {
        return new Date(secondsUntilRebase * 1000).toISOString().substr(11, 8);
    }

    const displayPercentChange = () => {
        if (percentChange || percentChange == 0) {
            let direction;
            if (percentChange == 0) direction = ""; else direction = percentChange > 0 ? "Increase" : "Decrease";
            return percentChange.toFixed(5) + "% " + direction;
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


    // UTILITIES
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function big(number) {
        return ethers.BigNumber.from(number);
    }

    function toDays(seconds) {
        return Math.floor(seconds / 86400);
    }

    function ref(reference) {
        return reference.current;
    }


    // STYLES
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // const priceIncreaseColor = "#67E87F";
    // const priceDecreaseColor = "#FF4B4B";
    // const priceNeutralColor = "#92ACB8";
    // const percentChangeColor = () => {
    //     if (percentChange > 0) return { color: priceIncreaseColor };
    //     if (percentChange < 0) return { color: priceDecreaseColor };
    //     return { color: priceNeutralColor };
    // }

    // const selectedChainColorETH = "#2CB7EA";
    // const selectedChainColorBSC = "#EEC632";
    // const unselectedChainColor = "#92ACB8";
    // const chainColorETH = () => {
    //     if (usingEthereum()) return { color: selectedChainColorETH };
    //     return { color: unselectedChainColor };
    // }
    // const chainColorBSC = () => {
    //     if (usingBinance()) return { color: selectedChainColorBSC };
    //     return { color: unselectedChainColor };
    // }

    // const theme = createMuiTheme({
    //     overrides: {
    //         MuiSwitch: {
    //             switchBase: {
    //                 // Controls default (unchecked) color for the thumb
    //                 color: selectedChainColorETH
    //             },
    //             colorSecondary: {
    //                 "&$checked": {
    //                     // Controls checked color for the thumb
    //                     color: selectedChainColorBSC
    //                 }
    //             },
    //             track: {
    //                 // Controls default (unchecked) color for the track
    //                 opacity: 0.2,
    //                 backgroundColor: "#F5F1F3",
    //                 "$checked$checked + &": {
    //                     // Controls checked color for the track
    //                     opacity: 0.2,
    //                     backgroundColor: "#F5F1F3"
    //                 }
    //             }
    //         }
    //     }
    // });


    // REACT ELEMENT
    ///////////////////////////////////////////////////////////////////////////////////////////////
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

                <div className="activities__blockchainSwitch">
                    {/* <span style={chainColorETH()}>Ethereum</span>
                    <ThemeProvider theme={theme}>
                        <Switch
                            value={usingBinance()} />
                    </ThemeProvider>
                    <span style={chainColorBSC()}>Binance</span> */}
                </div>

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
                                <p><span onClick={maxStakeOnClick}>Max: {displayMaxStakeAmount()}</span></p>
                            </div>
                            <div className="activity__unstake-button">
                                <ButtonBase
                                    disabled={stakeLoading}
                                    onClick={UNSTAKE}>
                                        {!stakeLoading && "Unstake & Redeem"}
                                        {stakeLoading && "Unstake & Redeem..."}
                                        {stakeLoading && <CircularProgress size={16} color="inherit" />}
                                </ButtonBase>
                                <p><span onClick={maxUnstakeOnClick}>Max: {displayMaxUnstakeAmount()}</span></p>
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
                                <p><span onClick={maxExchangeOnClick}>Max: {displayMaxExchangeAmount()}</span></p>
                            </div>
                        </div>

                    </div>

                </div>

                <div className="activities__refresh"
                    onClick={refreshDataOnClick}>
                        <MdRefresh size={28}/><span>Refresh blockchain data after transactions</span>
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
