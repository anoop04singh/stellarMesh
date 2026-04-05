#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct Reputation {
    pub service_id: String,
    pub successful_settlements: u32,
    pub failed_settlements: u32,
    pub score: u32,
    pub last_snapshot_ledger: u32,
}

#[contracttype]
enum DataKey {
    Admin,
    Reputation(String),
}

#[contract]
pub struct ReputationLedger;

#[contractimpl]
impl ReputationLedger {
    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn upsert_snapshot(
        env: Env,
        service_id: String,
        successful_settlements: u32,
        failed_settlements: u32,
        score: u32,
        ledger: u32,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let snapshot = Reputation {
            service_id: service_id.clone(),
            successful_settlements,
            failed_settlements,
            score,
            last_snapshot_ledger: ledger,
        };

        env.storage().persistent().set(&DataKey::Reputation(service_id), &snapshot);
    }

    pub fn get_snapshot(env: Env, service_id: String) -> Reputation {
        env.storage()
            .persistent()
            .get(&DataKey::Reputation(service_id))
            .unwrap()
    }

    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v1")
    }
}
