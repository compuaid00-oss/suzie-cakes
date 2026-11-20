# Suzie Cakes And Events — Deployment Cheat Sheet

## One-time setup

### 1. Generate bcrypt password hash
```bash
mkdir pwgen && cd pwgen
npm init -y
npm install bcryptjs
node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD_HERE', 10))"