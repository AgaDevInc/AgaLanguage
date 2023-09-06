const cmd = new Deno.Command(Deno.execPath(),{
  args: ['bundle','index.ts', 'index.js'],
});
const cp = cmd.spawn();
const data = await cp.status;
if (!data.success) {
  console.log('Error');
  Deno.exit(1);
}
console.log('Success');

const indexJS = Deno.readTextFileSync('index.js');

const indexCJS = 'module.exports = (async ()=>{ const exports = {};'
 + indexJS.replace(/export { ([^ ]+) as ([^ ]+) };/g, 'exports.$2 = $1;')
 + 'return exports\n})()';
Deno.writeTextFileSync('index.cjs', indexCJS);
console.log('index.cjs created');