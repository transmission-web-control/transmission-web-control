import Koa from 'koa'; // CJS: require('koa');
import serve from 'koa-static';
import proxy from 'koa-proxies';

const app = new Koa();

const PORT = process.env.PORT || 9999;
const TRANSMISSION_RPC = process.env.TRANSMISSION_RPC || 'http://192.168.1.3:9091/transmission/rpc';

app.use(
  proxy('/rpc', {
    target: TRANSMISSION_RPC,
    changeOrigin: true,
  }),
);

app.use(serve('./src/'));

app.listen({ port: Number(PORT), host: '127.0.0.1' }, () => {
  console.log('server start at http://127.0.0.1:9999/');
});
