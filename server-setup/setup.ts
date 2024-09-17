import { $ } from 'bun';
import readline from 'readline';
import fs from 'fs';

function logGreen(str: string, label = '') {
    console.log(...[label, '\x1b[32m%s\x1b[0m', str].filter(Boolean))
}


async function ask(question: string): Promise<string> {
    return <string>await new Promise(r => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(question, (ans) => {
            r(ans);
            rl.close();
        });
    });
}

function isRoot() {
    return Bun.env.USER === 'root';
}

async function installPackages() {
    await $`apt-get update -y -qq`.quiet();
    await $`apt-get upgrade -y -qq`.quiet();

    const packages = [
        'sudo',
        'ufw',
        'fail2ban',
        'htop',
        'curl',
        'nginx',
        'tmux',
        'git',
        'certbot',
        'python3-certbot-dns-cloudflare',
        'autojump',
        'zsh',
        'rustc',
        'golang',
        'nmap',
        'ffmpeg',
    ];
    for (const pkg of packages) {
        try {
            await $`apt-get -y -qq install ${pkg}`.quiet();
        } catch (e) {
            console.log(`Failed to install ${pkg}`);
        }
    }
    try {
        if (!Bun.which('docker')) {
            await $`curl -fsSL https://get.docker.com | bash`.quiet();
        }
    } catch (e) {
        console.log(`Failed to install docker`);
    }

    try {
        await $`curl -L git.io/antigen > .antigen.zsh`.quiet();
        fs.writeFileSync(
            '/root/.zshrc', `
source $HOME/.antigen.zsh

# Load the oh-my-zsh's library.
antigen use oh-my-zsh

# Syntax highlighting bundle.
antigen bundle zsh-users/zsh-autosuggestions
antigen bundle zsh-users/zsh-syntax-highlighting

# Bundles from the default repo (robbyrussell's oh-my-zsh).
antigen bundle git
antigen bundle brew
antigen bundle pip
antigen bundle bun
antigen bundle node
antigen bundle npm
antigen bundle yarn
antigen bundle flutter
antigen bundle aliases
antigen bundle macos

# Load the theme.
antigen theme clean

# Tell Antigen that you're done.
antigen apply

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

#bun
export BUN_INSTALL="$HOME/.bun" 
export PATH="$BUN_INSTALL/bin:$PATH"
`
        );
    } catch (e) {
        console.log(`Failed to install ohmyzsh`);
    }
}

async function systemConfig() {
    const configPath = '/etc/ssh/sshd_config';
    const from = 'yes';
    const to = 'no';

    await $`sed -i '/PermitRootLogin ${from}/c\PermitRootLogin ${to}' ${configPath}`;
    await $`sed -i '/PasswordAuthentication ${from}/c\PasswordAuthentication ${to}' ${configPath}`;
    await $`sed -i '/#Port 22/c\Port 2218' ${configPath}`;
    await $`sed -i '/Port 22/c\Port 2218' ${configPath}`;
    await $`sed -i '/Port 2222/c\Port 2218' ${configPath}`;
    await $`rm -rf /etc/fail2ban/jail.local`;
    await $`cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local`;
    await $`sed -i '/backend = %(sshd_backend)s/c\sshd_backend = systemd\nbackend = %(sshd_backend)s' /etc/fail2ban/jail.local`;
    await $`sed -i '/bantime  = 10m/c\bantime  = 60m' /etc/fail2ban/jail.local`;
    await $`sed -i '/findtime  = 10m/c\findtime  = 60m' /etc/fail2ban/jail.local`;
    await $`sed -i '/maxretry = 5/c\maxretry = 3' /etc/fail2ban/jail.local`;
    await $`systemctl restart ssh`;
    await $`systemctl restart fail2ban`;
    const sshResp = await $`systemctl is-active ssh`.quiet();
    const fal2banResp = await $`systemctl is-active fail2ban`.quiet();
    logGreen(sshResp.text().trim(), 'SSH:');
    logGreen(fal2banResp.text().trim(), 'Fail2ban:');

    await $`chsh -s /usr/bin/zsh`;
    await $`timedatectl set-timezone America/Phoenix`;
}

async function addNewUser() {
    let username = '';
    while (!username.match(/^\w+$/)) {
        username = await ask('Username: ') ?? '';
    }

    await $`useradd -m -G sudo,docker -s /usr/bin/zsh ${username}`;
    await $`echo "${username}:${username}" | sudo chpasswd`;

    try {
        await $`cp -r /root/.zshrc /home/${username}/.zshrc`;
        await $`chown -R ${username}:${username} /home/${username}/.zshrc`;
        await $`cp -r /root/.antigen.zsh /home/${username}/.antigen.zsh`;
        await $`chown -R ${username}:${username} /home/${username}/.antigen.zsh`;
        await $`su - ${username} -c "curl -fsSL https://bun.sh/install | bash"`.quiet();
    } catch (e) {
        console.log((<Error>e).message);
    }

    return username;
}

async function addSshKeys(username: string) {
    const sshDir = `/home/${username}/.ssh`;
    if (!fs.existsSync(sshDir)) {
        fs.mkdirSync(sshDir);
    }
    while (true) {
        const sshkey = await ask('Enter ssh public key: ');
        if (!sshkey.length) break;
        fs.appendFileSync(`${sshDir}/authorized_keys`, sshkey + '\n');
    }
}

async function main() {
    if (!isRoot()) return console.log('Run this script as root user');
    console.log('\nInstalling packages...');
    await installPackages();
    console.log('\nSetting up ssh and other configs...');
    await systemConfig();
    console.log('\nAdding new user...');
    const username = await addNewUser();
    if (username) {
        console.log('\nAdding ssh public keys to authorized list...');
        await addSshKeys(username);
    }

    if (username) {
        console.log();
        logGreen(`All Done! Make sure to update password for ${username}`);
    }
}

main().catch((e) => {
    console.log('Error:', e.message);
});

process.on('exit', (c) => { });
