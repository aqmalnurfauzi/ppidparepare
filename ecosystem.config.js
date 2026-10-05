module.exports = {
    apps: [
        {
            name: 'ppidparepare:3005',
            script: 'npm',
            args: 'run dev -- -p 3005',
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: 3005
            }
        }
    ]
};