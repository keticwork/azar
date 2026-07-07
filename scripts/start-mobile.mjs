import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const mode = process.argv[2] ?? 'tunnel';
const port = process.env.EXPO_PORT ?? '8081';
const maxTunnelAttempts = Number(process.env.EXPO_TUNNEL_ATTEMPTS ?? 3);
const earlyExitMs = 45_000;

if (!['lan', 'tunnel'].includes(mode)) {
  console.error('Usage: node scripts/start-mobile.mjs [lan|tunnel]');
  process.exit(1);
}

const env = { ...process.env };
const baseArgs = ['expo', 'start', '--go'];
let args = [...baseArgs];

if (mode === 'lan') {
  const host = getLocalIp();
  if (host) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  }
  args.push('--lan', '--port', port, '--clear');
  console.log(`Starting Expo Go over LAN on ${host ?? 'auto'}:${port}`);
} else {
  args.push('--tunnel');
  console.log('Starting Expo Go over tunnel. This is temporary and best for real-device tests.');
  console.log(`Tunnel startup will retry up to ${maxTunnelAttempts} times if Expo/ngrok drops early.`);
}

runExpo(1);

function runExpo(attempt) {
  const startedAt = Date.now();
  const attemptArgs = attempt === 1 ? [...args, '--clear'] : args;
  if (mode === 'tunnel') {
    console.log(`Expo tunnel attempt ${attempt}/${maxTunnelAttempts}`);
  }
  const child = spawn('npx', attemptArgs, {
    env,
    shell: false,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    const exitedEarly = Date.now() - startedAt < earlyExitMs;
    if (mode === 'tunnel' && code && exitedEarly && attempt < maxTunnelAttempts) {
      console.log(`Expo tunnel stopped early. Retrying ${attempt + 1}/${maxTunnelAttempts}...`);
      setTimeout(() => runExpo(attempt + 1), 1500);
      return;
    }

    process.exit(code ?? 0);
  });
}

function getLocalIp() {
  const interfaces = networkInterfaces();
  const candidates = Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);

  return candidates.find((address) => address.startsWith('192.168.'))
    ?? candidates.find((address) => address.startsWith('10.'))
    ?? candidates.find((address) => address.startsWith('172.'))
    ?? candidates[0];
}
