'use strict';

const Koa = require('koa');
const { spawn } = require('child_process');

const app = new Koa();
let threadset = new Map();

function getVideoInfo(url, id, download = false) {
    //console.log(url);
    if (threadset.size > 20) {
        let longesttime = 1e100;
        let tempid = '';
        for (let i of threadset.keys()) {
            if (threadset.get(i).settime < longesttime) {
                longesttime = threadset.get(i).settime
                tempid = i;
            }
        }
        threadset.get(tempid).yougetObj = null;
        threadset.delete(tempid);
    }
    const youget = spawn('you-get', [download ? '' : '-u', url]);
    threadset.set(id, {
        settime: +new Date(),
        stdout: [],
        stderr: [],
        yougetObj: youget
    });
    youget.stdout.on('data', data => {
        threadset.get(id).stdout.push(data.toString());
    });

    youget.stderr.on('data', data => {
        threadset.get(id).stderr.push(data.toString());
    });

    youget.on('close', code => {
        //console.log(threadset.get(id));
        threadset.get(id).yougetObj = null;
    });
}

app.use(async (ctx, next) => {
    ctx.response.set({
        'Access-Control-Allow-Origin': '*'
    })
    await next();
})

app.use(async (ctx, next) => {
    if (ctx.method === "GET" && ctx.path === "/getvideoinfo") {
        let id = Math.random().toString(36).substr(2);
        if (ctx.query['videourl']) {
            getVideoInfo(ctx.query['videourl'], id);
            ctx.type = 'application/json';
            ctx.body = JSON.stringify({ id });
        }
    } else {
        await next();
    }
})

app.use(async (ctx, next) => {
    if (ctx.method === "GET" && ctx.path === "/getbyid") {
        if (threadset.has(ctx.query['id'])) {
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(threadset.get(ctx.query['id']))
        }
    } else {
        await next();
    }
})

app.use(async (ctx, next) => {
    if (ctx.method === "GET" && ctx.path === "/listid") {
        let templist = [];
        for (let id of threadset.keys()) {
            templist.push(id);
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(templist);
        }
        await next();
    } else {
        await next();
    }
})

app.listen(8006, '0.0.0.0');
console.log(`server is listening on port 8006`)