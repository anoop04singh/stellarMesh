Get-Content '.env.testnet.local' | ForEach-Object {
  if ($_ -match '^(.*?)=(.*)$') {
    Set-Item -Path ("env:" + $matches[1]) -Value $matches[2]
  }
}

& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract invoke `
  --id $env:SEARCH_CHANNEL_CONTRACT `
  --source-account $env:PAYER_SECRET `
  --network-passphrase 'Test SDF Network ; September 2015' `
  --rpc-url 'https://soroban-testnet.stellar.org' `
  --send yes `
  -- top_up --amount 1000000
