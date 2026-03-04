module.exports = {
  apps: [
    {
      name: 'premium-voucher-system',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=passport24-voucher-production --local --ip 0.0.0.0 --port 3000',
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
