
    import {render} from 'rxui/index'
    import App from "/Users/chemingjun/Work/dev/FE/rocker-mvc-plugin-render-react/test/TT.tsx";
    
    const script = document.querySelector('#_script_')
    const datas = {}
    let props = ""

    let val = script.dataset.obj;
    val = /^\[|\{]/.test(val) && typeof val !== 'object'?JSON.parse(val):val;
    for(let nm in val){
        props+=' :' + nm + '="' + nm + '"';
    }
  
    render(App, script, () => {
        script.replaceWith(...[...script.childNodes])
      }
    )
        