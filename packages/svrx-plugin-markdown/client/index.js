import ReactMarkdown from 'react-markdown';
import { render as _render } from 'react-dom';
import React from 'react';
import Code from './code';
import {inViewport, findParent, getTarget} from './util'

const svrx = window.__svrx__;
const pathname = location.pathname.slice(1);

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { input: '' };

        this.fetchState().then(() => this.tryStartMutation());

        svrx.events.on('livereload:update', (evt) => {
            if (evt.path.indexOf(pathname) !== -1) {
                evt.stop = true;
                this.fetchState();
            }
            // 取得
        });
    }

    fetchState() {
        return new Promise((resolve) => {
            svrx.io.call('markdown.content', pathname).then((input) => {
                this.setState({
                    input
                });
                setTimeout(resolve, 100);
            });
        });
    }

    tryStartMutation() {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        const observeMutationSupport = !!MutationObserver;

        if (observeMutationSupport) {
            const observer = new MutationObserver((records)=>{
              // always handle only one recore
              this.keepVisualNode( getTarget( records[0]) )

            });
            observer.observe(document.querySelector('.markdown-body'), {
              childList:true,
              characterData: true,
              subtree:true
            })
        }
    }

    keepVisualNode(node){
      if(!node) return;
      node = findParent(node);

      if(inViewport(node)) return;


      window.scrollTo({
        'behavior': 'smooth',
        'left': 0,
        'top': node.offsetTop
      });

    }



    render() {
        const { input } = this.state;
        const renderers = { code: Code };
        return <ReactMarkdown source={input} renderers={renderers} />;
    }
}

_render(<App />, document.querySelector('.markdown-body'));
