import start from '../src/index'
import * as path from "path";

const data = [[{
  render: [
    {path: path.join(__dirname, `./TT.tsx`)}
  ]
}]]

start({
  wrapper: './tpt.ejs'
})(data)

setTimeout(h => {
  const compile = data[0][0].render[0].compile()
  const content = compile({msg:'22222222'})
  debugger
}, 5000)