import express from 'express';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import http from 'http';
import https from 'https';
import stream from 'stream';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import CoreConfigHandler from './utils/coreConfigHandler';

let err404 = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title><style>*{margin:0;padding:0;font-family:sans-serif}body,html{width:100%;height:100%;overflow:auto;color:#000;background-color:#fff;box-sizing:border-box}.container{margin-left:auto;margin-right:auto;--padding:18px;padding-left:var(--padding);padding-right:var(--padding);width:calc(100% - var(--padding) * 2);margin-top:80px;border-radius:8px;transition:all ease .2s,background-color 0s,color 0s}@media (min-width:980px){.container{max-width:978px}}@media (min-width:1200px){.container{max-width:1128px}}@media (max-height:500px){.container{margin-top:18px}}#backHome{display:inline-flex;align-items:center;color:#fff;background-color:#333;border-radius:16px;margin:16px 0 0;padding:16px 32px;transition:all ease .2s,background-color 0s,color 0s;user-select:none}#backHome:hover{transition:all ease .2s;background-color:#2a2a2a}#backHome:active{transition:all ease .2s;background-color:#2a2a2a;transform:scale(.95)}#backHome svg{fill:#fff}.col-2{color:#222}.headline-1{font-size:3em;font-weight:600;margin-bottom:24px}.headline-5{font-size:1em;font-weight:600;margin-bottom:0}</style></head><body><div class="container"><div><h1 class="headline-1 col-2">Page not found</h1><h5 class="headline-5 col-2">Sorry, we can't find the page you are looking for in this download server.</h5></div><div id="backHome">Back Home</div></div></body><script>document.querySelector('#backHome').addEventListener('click', () => { location.pathname = "/" });</script></html>`;
let handlepage = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Handle Page</title><style>*{margin:0;padding:0;font-family:sans-serif;box-sizing:border-box;scrollbar-width:thin}body,html{width:100%;height:100%;overflow:hidden;color:#000;background-color:#fff}body{display:flex;flex-direction:row}@media (max-width:980px){body{flex-direction:column}}.container{display:inline-block;--padding:18px;padding-left:var(--padding);border-radius:8px;transition:all ease .2s,background-color 0s,color 0s}.btn{display:inline-flex;align-items:center;color:#fff;background-color:#333;border-radius:12px;padding:8px 16px;margin-right:4px;margin-bottom:4px;transition:all ease .2s,background-color 0s,color 0s;user-select:none}.btn:hover{transition:all ease .2s;background-color:#2a2a2a}.btn:active{transition:all ease .2s;background-color:#2a2a2a;transform:scale(.95)}.btn svg{fill:#fff}.col-2{color:#222}.headline-1{font-size:3em;font-weight:600;margin-bottom:12px}.headline-5{font-size:1em;font-weight:600;margin-bottom:0}iframe{border:#181818 2px solid;width:100%;height:100%;border-radius:12px}.container2{display:inline-block;width:100%;height:100%;padding:8px}</style></head><body><div class="container"><h1 class="headline-1 col-2">Handle Page</h1><div><h5 class="headline-5 col-2">Update</h5><div class="btn">Restart</div><div class="btn">Core</div><div class="btn">Argo</div><div class="btn">All</div><br /><br /><h5 class="headline-5 col-2">Version</h5><div class="btn">Get</div><div class="btn">Clear</div></div></div><div class="container2"><iframe src="about:blank" frameborder="0"></iframe></div></body><script>let iframe=document.querySelector("iframe");document.querySelectorAll(".btn").forEach(element=>{element.addEventListener("click",()=>{switch(element.innerHTML){case"Restart":iframe.src=location.href+"/update";break;case"Core":iframe.src=location.href+"/update?core";break;case"Argo":iframe.src=location.href+"/update?argo";break;case"All":iframe.src=location.href+"/update?core&argo";break;case"Get":iframe.src=location.href+"/version";break;default:iframe.src="about:blank";break}})});</script></html>`;

dotenv.config();
const app = express();
app.disable('x-powered-by');
const config = (() => {
  let config_json;
  try {
    config_json = JSON.parse(process.env.CONFIG);
  } catch {
    try {
      config_json = JSON.parse(fs.readFileSync('./config.json').toString());
    } catch {
      console.log('[软件]', `Config Error`);
      config_json = {};
    }
  }
  let part_warp: any = {};
  if (config_json['warp']) {
    part_warp = {
      ...part_warp,
      warp_secretKey: config_json['warp']['key'] || '',
      warp_ipv4: config_json['warp']['ipv4'] || '172.16.0.2',
      warp_ipv6: config_json['warp']['ipv6'] || '',
      warp_reserved: [0, 0, 0],
      warp_publicKey: config_json['warp']['pubkey'] || 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=',
      warp_endpoint: config_json['warp']['endpoint'] || '162.159.192.1:2408' || 'engage.cloudflareclient.com:2408',
      add_ipv4: config_json['warp']['add4'] || false,
      add_ipv6: config_json['warp']['add6'] || false,
    };
    if (config_json['warp']['reserved']) {
      function decodeClientId(clientId) {
        const decodedBuffer = Buffer.from(clientId, 'base64');
        const hexString = decodedBuffer.toString('hex');
        const hexPairs = hexString.match(/.{1,2}/g) || [];
        const decimalArray = hexPairs.map(hex => parseInt(hex, 16));
        return decimalArray;
      }
      part_warp.warp_reserved = decodeClientId(config_json['warp']['reserved']);
    }
  }
  let part_argo: any = {
    argo_path: config_json['argo_path'] || (os.platform() == 'win32' ? './cloudflared.exe' : './cloudflared'),
  };
  if (config_json['argo']) {
    part_argo = {
      ...part_argo,
      use_argo: config_json['argo']['use'] || false,
      // [auto]/quic/http2
      argo_protocol: config_json['argo']['protocol'] || '',
      // none/us
      argo_region: config_json['argo']['region'] || '',
      argo_access_token: config_json['argo']['token'] || '',
    };
  }
  let part_tls = {};
  if (config_json['tls']) {
    part_tls = {
      ...part_tls,
      use_tls: config_json['tls']['use'] || false,
      // please use base64 encode
      tls_key: Buffer.from(config_json['tls']['key'], 'base64').toString() || '',
      tls_cert: Buffer.from(config_json['tls']['cert'], 'base64').toString() || '',
    };
  }
  return {
    // core
    core_path: config_json['core_path'] || (os.platform() == 'win32' ? './core.exe' : './core'),
    port: config_json['port'] || 3000,
    middle_port: config_json['middle_port'] || 58515,
    protocol: config_json['protocol'] || 'dmxlc3M=',
    // Tested: ws/xhttp
    network: config_json['network'] || 'ws',
    uuid: config_json['uuid'] || guid(),
    path: config_json['path'] || '/api',
    display_web_entry: config_json['display_web_entry'] || false,
    web_process: config_json['web_process'] || false,
    web_process_path: config_json['web_process_path'] || '/process',
    web_process_debug: config_json['web_process_debug'] || false,
    // tls
    ...part_tls,
    // warp
    ...part_warp,
    // argo (cloudflared)
    ...part_argo,
  };
})();

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let pid_core = NaN,
  pid_argo = NaN;

app.get('/generate_204', (req, res) => {
  res.status(204).send('');
});
app.get('/generate_200{*any}', (req, res) => {
  res.status(200).send('');
});
app.get(config.path + config.web_process_path, (req, res, next) => {
  if (config.display_web_entry) {
    res.send(handlepage);
  } else {
    next();
  }
});
app.get(config.path + config.web_process_path + '/debug', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  if (!config.web_process_debug) {
    res.end('web_process_debug off');
    return;
  }
  res.end(cp.execSync(`ps aux|sort -rn -k +4|head -50`).toString());
});
app.get(config.path + config.web_process_path + '/update', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  if (!config.web_process) {
    res.end('web_process off');
    return;
  }
  res.write('---- Start');
  if (!isNaN(pid_argo)) process.kill(pid_argo);
  if (!isNaN(pid_core)) process.kill(pid_core);
  pid_core = NaN;
  pid_argo = NaN;
  if (typeof req.query['argo'] == 'string') {
    try {
      const foo = await download_argo();
      if (foo) {
        res.write('\n' + 'argo下载成功' + '\n    ' + foo);
      } else {
        res.write('\n' + 'argo下载失败' + '\n    ' + foo);
      }
    } catch (err) {
      res.write('\n' + 'argo下载失败' + '\n    ' + err);
    }
  }
  if (typeof req.query['core'] == 'string') {
    try {
      const foo = await download_core();
      if (foo) {
        res.write('\n' + 'core下载成功' + '\n    ' + foo);
      } else {
        res.write('\n' + 'core下载失败' + '\n    ' + foo);
      }
    } catch (err) {
      res.write('\n' + 'core下载失败' + '\n    ' + err);
    }
  }

  start(true);
  res.end('\n' + '---- Done');
});
app.get(config.path + config.web_process_path + '/version', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  if (!config.web_process) {
    res.end('web_process off');
    return;
  }
  res.write(`Node version:`);
  let object = process.versions;
  for (const key in object) {
    if (Object.hasOwnProperty.call(object, key)) {
      const element = object[key];
      res.write(`\n    ${key}: ${element}`);
    }
  }
  res.write(`\n\nCore version:`);
  const core_version = await (_ => {
    return new Promise(async resolve => {
      let args = ['--version'];
      let processC = cp.spawn(config.core_path, args);
      let pData = '';
      processC.stdout.on('data', data => {
        pData += data.toString();
      });
      processC.on('close', () => {
        resolve(pData);
      });
    });
  })();
  res.write(`\n    ${core_version}`);
  res.write(`\n\nArgo version:`);
  const argo_version = await (_ => {
    return new Promise(async resolve => {
      let args = ['--version'];
      let processC = cp.spawn(config.argo_path, args);
      let pData = '';
      processC.stdout.on('data', data => {
        pData += data.toString();
      });
      processC.on('close', () => {
        resolve(pData);
      });
    });
  })();
  res.write(`\n    ${argo_version}`);

  res.end(null);
});

app.use(
  config.path,
  createProxyMiddleware({
    target: `http://127.0.0.1:${false ? 12100 : config.middle_port}${config.network === 'ws' ? '' : config.path}`,
    changeOrigin: true,
    ws: true,
    logger: {
      info: msg => {
        // console.log(msg);
      },
      warn: msg => {
        // console.log(msg);
      },
      error: msg => {
        console.log(msg);
      },
    },
  })
);

app.use((req, res, next) => {
  res.status(404).send(err404);
});

// 下载核心
function download_core() {
  return new Promise(async (resolve, reject) => {
    let url = 'https://tt.vg/DrLSV';
    if (os.platform() == 'linux') {
      let name = '';
      switch (os.arch()) {
        case 'x64':
          name += '';
          break;

        default:
          reject('Core: Unsupport Arch - ' + os.arch());
          return;
          break;
      }
      url = url + name;
    } else {
      reject('Core: Unsupport Platform - ' + os.platform());
      return;
    }
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        maxRedirects: 10,
      });
      fs.writeFileSync(path.resolve(process.cwd(), config.core_path), response.data);
      resolve(true);
    } catch (err) {
      console.log(err);
      resolve(false);
    }
  });
}
// 启动核心
async function start_core() {
  // 生成配置文件
  let extra = {};
  if (config.warp_secretKey && config.warp_ipv6 && (config.add_ipv4 || config.add_ipv6)) {
    let domainStrategy = 'IPIfNonMatch';
    let extra_iprules: any = [
      {
        type: 'field',
        ip: ['0.0.0.0/0'],
        outboundTag: config.add_ipv4 ? 'wireguard' : 'direct',
      },
      {
        type: 'field',
        ip: ['::/0'],
        outboundTag: config.add_ipv6 ? 'wireguard' : 'direct',
      },
    ];
    if (config.add_ipv4 && config.add_ipv6) {
      domainStrategy = 'AsIs';
      extra_iprules = [
        {
          type: 'field',
          port: '0-65535',
          outboundTag: 'wireguard',
        },
      ];
    }
    extra = {
      OutboundCustom: [
        {
          protocol: 'freedom',
          settings: {},
          tag: 'direct',
        },
        {
          protocol: 'blackhole',
          settings: {},
          tag: 'blocked',
        },
        {
          protocol: 'wireguard',
          settings: {
            kernelMode: false,
            secretKey: config.warp_secretKey,
            address: [config.warp_ipv4 + '/32', config.warp_ipv6 + '/128'],
            peers: [
              {
                publicKey: config.warp_publicKey,
                endpoint: config.warp_endpoint,
              },
            ],
            reserved: config.warp_reserved,
            mtu: 1420,
          },
          tag: 'wireguard',
        },
      ],
      RoutingCustom: {
        domainStrategy: domainStrategy,
        rules: [
          ...extra_iprules,
          {
            outboundTag: 'blocked',
            protocol: ['bittorrent'],
            type: 'field',
          },
        ],
      },
      DnsServerCustom: ['tcp+local://8.8.8.8'],
    };
  }

  let config_obj: any = new CoreConfigHandler().generateServerConfig({
    InboundPort: config.middle_port,
    InboundAddress: '127.0.0.1',
    sniffingEnabled: false,
    InboundProtocol: Buffer.from(config.protocol, 'base64').toString(),
    InboundUUID: config.uuid,
    InboundStreamType: config.network,
    InboundEncryption: 'auto',
    InboundStreamSecurity: 'none',
    InboundPath: config.path,
    ...extra,
  });
  config_obj = JSON.stringify(config_obj, null, '');
  // console.log(config_obj);

  await (_ => {
    return new Promise(async resolve => {
      if (os.platform() != 'linux') {
        resolve(0);
        return;
      }
      let args = ['+x', path.resolve(process.cwd(), config.core_path)];
      let processC = cp.spawn('chmod', args);
      processC.on('close', () => {
        console.log('[初始化]', 'core chmod完成');
        setTimeout(_ => resolve(0), 100);
      });
    });
  })();
  let processC = cp.spawn(path.resolve(process.cwd(), config.core_path), ['-c', 'stdin:']);
  let stdInStream = new stream.Readable();
  stdInStream.push(config_obj);
  stdInStream.push(null);
  stdInStream.pipe(processC.stdin);
  return new Promise(resolve => {
    processC.stdout.on('data', data => {
      // console.log(data.toString().trim());
      if (/\[Warning\] core: .* started/.test(data)) {
        console.log(`----------
[Config]
path: ${config.path}
uuid: ${config.uuid}
----------`);
        resolve([true, processC.pid]);
      }
    });
    processC.on('error', err => {
      resolve([false, err]);
    });
  });
}

// 下载argo
function download_argo() {
  return new Promise(async (resolve, reject) => {
    let url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
    if (os.platform() == 'linux') {
      let name = 'cloudflared-linux-';
      switch (os.arch()) {
        case 'arm64':
          name += 'arm64';
          break;
        case 'x64':
          name += 'amd64';
          break;

        default:
          reject('Cloudflared: Unsupport Arch - ' + os.arch());
          return;
          break;
      }
      url = url + name;
    } else if (os.platform() == 'win32') {
      let name = 'cloudflared-windows-';
      switch (os.arch()) {
        case 'x64':
          name += 'amd64.exe';
          break;

        default:
          reject('Cloudflared: Unsupport Arch - ' + os.arch());
          return;
          break;
      }
      url = url + name;
    } else {
      reject('Cloudflared: Unsupport Platform - ' + os.platform());
      return;
    }
    try {
      const response = await axios({
        url: url,
        responseType: 'arraybuffer',
        maxRedirects: 10,
      });
      fs.writeFileSync(path.resolve(process.cwd(), config.argo_path), response.data);
      resolve(response.data.length);
    } catch (err) {
      console.log(err);
      resolve(false);
    }
  });
}
// 启动argo
async function start_argo() {
  await (_ => {
    return new Promise(async resolve => {
      if (os.platform() != 'linux') {
        resolve(0);
        return;
      }
      let args = ['+x', path.resolve(process.cwd(), config.argo_path)];
      let processC = cp.spawn('chmod', args);
      processC.on('close', () => {
        console.log('[初始化]', 'argo chmod完成');
        setTimeout(_ => resolve(0), 100);
      });
    });
  })();

  let args = ['--url', `http://localhost:${config.port}`];
  if (config.argo_access_token) {
    args = ['run', '--token', config.argo_access_token];
    console.log('[Argo Config]', 'domain: Custom Token');
  }
  if (config.argo_protocol) {
    args.push('--protocol', config.argo_protocol);
  }
  if (config.argo_region) {
    args.push('--region', config.argo_region);
  }
  let processC = cp.spawn(path.resolve(process.cwd(), config.argo_path), ['tunnel', '--no-autoupdate', ...args]);
  return new Promise(resolve => {
    processC.stderr.on('data', data => {
      // https://.*[a-z]+cloudflare.com
      if (/Registered tunnel connection/.test(data)) {
        console.log(
          '[Argo Info]',
          data
            .toString()
            .match(/(?<=Registered tunnel connection).*/)[0]
            .trim()
        );
      } else if (!config.argo_access_token && /https:\/\/.*[a-z]+cloudflare.com/.test(data)) {
        console.log('[Argo Config]', `domain: ${data.toString().match(/(?<=https:\/\/).*[a-z]+cloudflare.com/)[0]}`);
      } else {
        // console.log(data.toString().trim());
      }
      resolve([true, processC.pid]);
    });
    processC.on('error', err => {
      console.log('[Argo Error]', err);
      resolve([false, err]);
    });
  });
}

// 监听端口
function listen_port() {
  let serverProxy;
  if (config.use_tls) {
    console.log('[软件]', `Enabled https`);
    if (config.tls_cert && config.tls_key) {
      const options = {
        key: config.tls_key,
        cert: config.tls_cert,
      };
      serverProxy = https.createServer(options, app);
    } else {
      console.log('[软件]', `https missing: tls_cert,tls_key`);
    }
  } else {
    serverProxy = http.createServer(app);
  }
  const try_connect = serverProxy => {
    serverProxy.listen(config.port, () => {
      console.log('[软件]', `Listening on port ${config.port}`);
    });
  };
  try_connect(serverProxy);
  serverProxy.on('error', e => {
    if (e.code === 'EADDRINUSE') {
      console.error('Address in use, retrying...');
      setTimeout(() => {
        serverProxy.close();
        try_connect(serverProxy);
      }, 1000);
    }
  });
}

start();
async function start(no_listen_port = false) {
  console.log('[OS Info]', `${os.platform()} ${os.arch()}`);
  if (config.use_argo) {
    if (!fs.existsSync(path.resolve(process.cwd(), config.argo_path))) {
      const foo = await download_argo();
      if (foo) {
        console.log('[初始化]', 'argo下载成功', `${Math.round((Number(foo) / 1024 / 1024) * 10) / 10} MB`);
      } else {
        console.log('[初始化]', 'argo下载失败');
      }
    } else {
      console.log('[初始化]', 'argo已存在');
    }
    const start_return = await start_argo();
    if (start_return[0]) {
      pid_argo = start_return[1];
      console.log('[初始化]', 'argo启动成功');
    } else {
      console.log('[初始化]', 'argo启动失败：', start_return[1]);
    }
  }

  if (!fs.existsSync(path.resolve(process.cwd(), config.core_path))) {
    const foo = await download_core();
    if (foo) {
      console.log('[初始化]', 'core下载成功');
    } else {
      console.log('[初始化]', 'core下载失败');
    }
  } else {
    console.log('[初始化]', 'core已存在');
  }
  const start_return = await start_core();
  if (start_return[0]) {
    pid_core = start_return[1];
    console.log('[初始化]', 'core启动成功');
  } else {
    console.log('[初始化]', 'core启动失败：', start_return[1]);
  }

  if (!no_listen_port) listen_port();
}

keepalive();
async function keepalive() {
  // 保持唤醒
  let keepalive_url = process.env.KEEP_ALIVE_URL;
  let keepalive_interval = Number(process.env.KEEP_ALIVE_INTERVAL) || 60 * 1000;
  if (!keepalive_url) return;

  try {
    const res = await fetch(keepalive_url);
    if (!res.ok) {
      console.log(`[KeepAlive] 请求失败: ${res.status} ${res.statusText}`);
    } else {
    }
  } catch (err) {
    console.log(`[KeepAlive] 网络错误: ${err.message}`);
  }
  setTimeout(() => {
    keepalive();
  }, keepalive_interval);
}
