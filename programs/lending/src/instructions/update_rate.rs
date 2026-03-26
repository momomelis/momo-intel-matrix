use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::state::{Lending, LendingRewardsRateModel, TokenReserve};

#[derive(Accounts)]
pub struct UpdateRate<'info> {
    pub lending: Account<'info, Lending>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub f_token_mint: InterfaceAccount<'info, Mint>,
    pub supply_token_reserves_liquidity: AccountLoader<'info, TokenReserve>,
    pub rewards_rate_model: Box<Account<'info, LendingRewardsRateModel>>,
}
