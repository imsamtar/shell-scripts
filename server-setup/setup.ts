import { $ } from 'bun';
import readline from 'readline';
import fs from 'fs';


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
    await $`apt-get update -y -qq`;
    await $`apt-get upgrade -y -qq`;

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
        'nmap',
    ];
    for (const pkg of packages) {
        try {
            await $`apt-get -y -qq install ${pkg}`;
        } catch (e) {
            console.log(`Failed to install ${pkg}`);
        }
    }
    try {
        if (!Bun.which('docker')) {
            await $`curl -fsSL https://get.docker.com | bash`;
        }
    } catch (e) {
        console.log(`Failed to install docker`);
    }

    try {
        await $`sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" -- --unattended`.quiet();
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
    await $`rm -rf /etc/fail2ban/jail.local`;
    await $`cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local`;
    await $`sed -i '/backend = %(sshd_backend)s/c\sshd_backend = systemd\nbackend = %(sshd_backend)s' /etc/fail2ban/jail.local`;
    await $`sed -i '/bantime  = 10m/c\bantime  = 60m' /etc/fail2ban/jail.local`;
    await $`sed -i '/findtime  = 10m/c\findtime  = 60m' /etc/fail2ban/jail.local`;
    await $`sed -i '/maxretry = 5/c\maxretry = 3' /etc/fail2ban/jail.local`;
    await $`systemctl restart fail2ban`;
    const resp = await $`systemctl is-active fail2ban`.quiet();
    console.log('Fail2ban:', resp.text().trim());

    await $`chsh -s /usr/bin/zsh`;
    await $`timedatectl set-timezone America/Phoenix`;
}

async function addNewUser() {
    let username = '';
    while (!username.match(/^\w+$/)) {
        username = await ask('Username:') ?? '';
    }

    await $`useradd -m -G sudo,docker -s /usr/bin/zsh ${username}`;
    await $`echo "${username}:${username}" | sudo chpasswd`;

    try {
        $`ln -s /root/.oh-my-zsh /home/${username}/.oh-my-zsh`;
        $`ln -s /root/.zshrc /home/${username}/.zshrc`;
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
        const sshkey = await ask('Enter ssh public key:');
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
        console.log(`\nAll Done! Make sure to update password for ${username}`);
    }
}

main().catch((e) => {
    console.log('Error:', e.message);
});

process.on('exit', (c) => { });
