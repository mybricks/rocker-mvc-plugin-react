export default function entryFactory(path, scriptId) {
  return `
    import {render} from 'rxui'
    import Page from "${path}";
    
    const script = document.querySelector('#${scriptId}')
    
    function _Page(){
        return (<Page {...JSON.parse(script.dataset.obj)}/>)
    }
    
    render(_Page, script, () => {
        script.replaceWith(...[...script.childNodes])
      }
    )
        `
}
