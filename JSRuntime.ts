// deno-lint-ignore-file no-explicit-any
interface JSRuntime<Name extends JSRuntimeName = 'browser'> {
  name: Name
  cwd(): string,
  exit(code: number): void,
  inspect(value: any): string,
  resolve(folder: string, path: string): string,
  readFile(path: string): Promise<string>,
}

type JSRuntimeName = 'node' | 'browser' | 'deno' | 'bun'



const runtimes: {
  [Name in JSRuntimeName]: () => JSRuntime<Name>
} = {
  node(){
    const {readFile} = (globalThis as any).require(`${'node'}:fs/promises`);
    const {inspect} = (globalThis as any).require(`${'node'}:util`);
    const {resolve} = (globalThis as any).require(`${'node'}:path`);
    const https = (globalThis as any).require(`${'node'}:https`);
    const http = (globalThis as any).require(`${'node'}:http`);
    function myfetch(path: string): Promise<any> {
      return new Promise((resolve, reject) => {
        const protocol = path.startsWith('https') ? https : http;
        protocol.get(path, (res: any) => {
          if(res.statusCode !== 200) return reject(res.statusMessage);
          const chunks: any[] = [];
          res.on('data', (chunk: any) => chunks.push(chunk));
          res.on('end', () => resolve((globalThis as any).Buffer.concat(chunks).toString('utf-8')));
        }).on('error', reject);
      });
    
    }
    return {
      async readFile(path: string): Promise<string> {
        if(path.startsWith('http')) return await myfetch(path);
        return await readFile(path, 'utf-8');
      },
      exit(code: number): void {
        (globalThis as any).process.exit(code);
      },
      cwd(): string {
        return (globalThis as any).process.cwd();
      },
      inspect(value: any): string {
        return inspect(value);
      },
      resolve(folder: string, path: string): string {
        return resolve(folder, path);
      },
      name: 'node'
    }
  },
  browser(){
    return {
      cwd(): string {
        return (globalThis as any).location.href;
      },
      exit(_code: number): void {
        (globalThis as any).window.close();
      },
      inspect(value: any): string {
        return JSON.stringify(value);
      },
      async readFile(path: string): Promise<string> {
        const data = await (globalThis as any).fetch(path);
        return await data.text();
      },
      resolve(folder: string, path: string): string {
        folder = (folder+'/').replace(/[\/]{1,}/g, '/');
        const url = new URL(path, folder || undefined)
        return url.href;
      },
      name: 'browser'
    }
  },
  deno(){
    return {
      async readFile(path: string): Promise<string> {
        try {
          return await Deno.readTextFile(path);
        } catch (_) {
          return await fetch(path).then((res: any) => res.text());
        }
      },
      cwd(): string {
        return Deno.cwd();
      },
      exit(code: number): void {
        Deno.exit(code);
      },
      inspect(value: any): string {
        return Deno.inspect(value);
      },
      resolve(folder: string, path: string): string {
        folder = (folder+'/').replace(/[\/]{1,}/g, '/');
        const url = new URL(path, folder || undefined)
        return url.href;
      },
      name: 'deno'
    }
  },
  bun(){
    return {
      readFile(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
          (async ()=>{
            try{
              const file = (globalThis as any).Bun.file(path);
              resolve(await file.text());
            }catch(_){
              fetch(path).then((res: any) => res.text()).then(resolve).catch(reject);
            }
          })()
        });
      },
      cwd(): string {
        return (globalThis as any).cwd
      },
      exit(code: number): void {
        (globalThis as any).process.exit(code);
      },
      inspect(value: any): string {
        return (globalThis as any).Bun.inspect(value);
      },
      resolve(folder: string, path: string): string {
        return (globalThis as any).Bun.resolveSync(folder, path);
      },
      name: 'bun'
    }
  }
}

declare global {
  // deno-lint-ignore no-var
  var JSRuntime: JSRuntime<JSRuntimeName>
}
if(!globalThis.JSRuntime){
  let runtime: JSRuntimeName = 'browser';
  if((globalThis as any).process) runtime = 'node';
  if((globalThis as any).Deno) runtime = 'deno';
  if((globalThis as any).Bun) runtime = 'bun';
  globalThis.JSRuntime = runtimes[runtime]();
}