import { ethers } from 'ethers';
import { IERC20_ABI } from '../abi/IERC20';
import { REBASE_CONTROLLER_ABI } from '../abi/RebaseController';
import { STAKING_POOL_ABI } from '../abi/StakingPool';
import { YFKA_EXCHANGE_ABI } from '../abi/YfkaExchange';

// Provider Details --------------------------------------------------------------//

const ALCHEMY_MAINNET_PROJECT_ID = process.env.REACT_APP_ALCHEMY_MAINNET_PROJECT_ID;
const ALCHEMY_KOVAN_PROJECT_ID = process.env.REACT_APP_ALCHEMY_KOVAN_PROJECT_ID;

const MAINNET_PROVIDER = ethers.getDefaultProvider("homestead", {
    alchemy: ALCHEMY_MAINNET_PROJECT_ID
});

const KOVAN_PROVIDER = ethers.getDefaultProvider("kovan", {
    alchemy: ALCHEMY_KOVAN_PROJECT_ID
});

// Addresses ---------------------------------------------------------------------//

export const ZEPHYR_TOKEN_ADDRESS = "0xAB9Bc96dba750CEf51a9d0d98C480eD2f12A40a4";
export const REBASE_CONTROLLER_ADDRESS = "0xbD8677FD5FBb38cC4e0C0E68Facaef62Aca172B7";
export const BTS_DISTRIBUTION_ADDRESS = "0x4F09Dba84410736ab9D4b6E6c75020c008c2dA82";
export const UNISWAP_POOL_ADDRESS = "0x3F66c663c7c1d802bF3A6503bcf3e13B0ef49C28";
export const STAKING_POOL_ADDRESS = "0x3a08AdAF222CA3BF39440e0A7Fb6B76728817D41";
export const YFKA_TOKEN_ADDRESS = "0xFf02a51C1B3cA9c9850D9Ad9b3B7e792fD2ab4e9";
export const YFKA_EXCHANGE_ADDRESS = "0x8B86064A1bc4F2FC56fD5aC0aEfCbaC26F710771";

// Contracts ---------------------------------------------------------------------//
      
export const WEB3_PROVIDER = KOVAN_PROVIDER;

export const ZEPHYR_TOKEN = new ethers.Contract(ZEPHYR_TOKEN_ADDRESS, IERC20_ABI, WEB3_PROVIDER);
export const REBASE_CONTROLLER = new ethers.Contract(REBASE_CONTROLLER_ADDRESS, REBASE_CONTROLLER_ABI, WEB3_PROVIDER);
export const UNISWAP_POOL = new ethers.Contract(UNISWAP_POOL_ADDRESS, IERC20_ABI, WEB3_PROVIDER);
export const STAKING_POOL = new ethers.Contract(STAKING_POOL_ADDRESS, STAKING_POOL_ABI, WEB3_PROVIDER);
export const YFKA_TOKEN = new ethers.Contract(YFKA_TOKEN_ADDRESS, IERC20_ABI, WEB3_PROVIDER);
export const YFKA_EXCHANGE = new ethers.Contract(YFKA_EXCHANGE_ADDRESS, YFKA_EXCHANGE_ABI, WEB3_PROVIDER);
