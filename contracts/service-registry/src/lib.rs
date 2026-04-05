#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[derive(Clone)]
#[contracttype]
pub struct Service {
    pub id: String,
    pub owner: Address,
    pub name: String,
    pub endpoint_url: String,
    pub price_cents: u32,
    pub capability_tags: Vec<String>,
    pub payment_methods: Vec<Symbol>,
    pub active: bool,
}

#[contracttype]
enum DataKey {
    Service(String),
    Services,
}

#[contract]
pub struct ServiceRegistry;

#[contractimpl]
impl ServiceRegistry {
    pub fn upsert_service(
        env: Env,
        owner: Address,
        id: String,
        name: String,
        endpoint_url: String,
        price_cents: u32,
        capability_tags: Vec<String>,
        payment_methods: Vec<Symbol>,
    ) {
        owner.require_auth();

        let service = Service {
            id: id.clone(),
            owner,
            name,
            endpoint_url,
            price_cents,
            capability_tags,
            payment_methods,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Service(id.clone()), &service);

        let mut ids = env
            .storage()
            .persistent()
            .get::<_, Vec<String>>(&DataKey::Services)
            .unwrap_or(Vec::new(&env));

        if !ids.iter().any(|existing| existing == id) {
            ids.push_back(id);
            env.storage().persistent().set(&DataKey::Services, &ids);
        }
    }

    pub fn set_active(env: Env, owner: Address, id: String, active: bool) {
        owner.require_auth();
        let mut service: Service = env.storage().persistent().get(&DataKey::Service(id)).unwrap();
        service.active = active;
        env.storage().persistent().set(&DataKey::Service(service.id.clone()), &service);
    }

    pub fn get_service(env: Env, id: String) -> Service {
        env.storage().persistent().get(&DataKey::Service(id)).unwrap()
    }

    pub fn list_service_ids(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::Services)
            .unwrap_or(Vec::new(&env))
    }

    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v1")
    }
}
