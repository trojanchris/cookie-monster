class Dropdown extends HTMLElement {
    constructor(obj) {
        super();
        var shadow = this.attachShadow({ mode: 'open' });
        this.shadow = shadow;
        var style = document.createElement("style");
        style.textContent = `
        .drop {position: relative}
        .update-container {min-width:120px; position: relative; padding:10px; font-size:16px;background: rgb(55,54,59);}
        .update-div {padding-right: 20px; color: white;}
        .droparrow {position: absolute; right:20px; top:10px; font-size:20px; color: whitesmoke}
        .drop-content {font-size: 16px !important; background: rgb(55,54,59); color: white; min-width: 160px; box-shadow: 0 8px 16px 0 rgba(0,0,0,.4); max-height: 500px; overflow-y: scroll; z-index: 500; position: absolute;}
        .drop-content a {font-size:16px; float: none; color: white; padding: 6px 12px; text-decoration: none; display: block; text-align: left; background: #4d5356;}
        .drop-content a:hover {background-color: rgb(55,54,59); color: white; cursor: pointer;}
        ::-webkit-scrollbar {display: none}
        .dispnone {display: none}`;
		shadow.appendChild(style);
		let div = document.createElement('link');
		div.href = "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";
		div.type = "text/css";
		div.rel = "stylesheet";
		div.integrity = "sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN";
		div.setAttribute('crossorigin',"anonymous");
		shadow.appendChild(div);
        let div2 = document.createElement('div');
        shadow.appendChild(div2);
        this.content = div2;
        this.create(obj);
    }

    create({buttonid, values, callback}) {
        this.id = `dd-${buttonid}`;
        let content = this.content;
        let q = (query) => document.querySelector(query);
        let qa = (query) => document.querySelectorAll(query);
        let id = (id) => document.getElementById(id);
        let inittext = values[0].text || 'None';
        let initval = values[0].value || 'None';
        this.values = values;
        var dm = new Proxy({}, {
            get: (target, key, receiver) =>
                (attrs={}, children='', evts={}) =>
                {
                    if((typeof children === 'string') && Object.keys(attrs).length ===0)
                        return children;
                    let shouldInsert = child => (typeof child === 'string' || typeof child == 'boolean' || typeof child == 'number');
                    var el = document.createElement(key);
                    for(let child of children)
                    {
                        if(shouldInsert(child))
                            el.insertAdjacentHTML('beforeend',child);
                        else
                        if(child instanceof Array)
                            child.forEach(c => {
                                if(shouldInsert(c))
                                    el.insertAdjacentHTML('beforeend',c);
                                else
                                    el.appendChild(c)
                            });
                        else
                            el.appendChild(child);
                    }
                    for(let key in attrs)
                        if(key != 'data')
                            el.setAttribute(key, attrs[key]);
                    for(let evt in evts)
                    {
                        if(evt == 'subs')
                        {
                            for(let ev in evts[evt])
                            {
                                el.querySelectorAll(ev).forEach(sub_el => {
                                    sub_el.addEventListener(evts[evt][ev].type, evts[evt][ev].func);
                                });
                            }
                        }
                        else
                        if(evt == 'after')
                        {
                            evts[evt](el);
                        }
                        else
                            el.addEventListener(evt, evts[evt]);
                    }
                    return el;
            }
        });
        let dropdown = dm.div({}, [
            dm.div({ class: 'drop', style: 'position:relative' }, [
                dm.div({ class: 'drop-button' }, [
                    dm.div({ class: 'row' }, [
                        dm.div({ class: 'col update-container' }, [
                            dm.div({ id: buttonid, value: initval, class: 'update-div' }, [
                                inittext
                            ]),
                            dm.i({ class: 'fa fa-angle-double-down droparrow' })
                        ])
                    ])
                ], {
                        click: function (e) {

                            let sibling = this.nextElementSibling;
                            sibling.classList.remove('dispnone');

                            function wait(e) {
                                sibling.classList.add('dispnone');

                                if(e.path[0].hasAttribute('value2')) {

                                    let val = e.path[0].getAttribute('value');
                                    let text = e.path[0].getAttribute('text');
                                    var ele = content.querySelector(`#${buttonid}`);

                                    ele.setAttribute('value',val);
                                    ele.innerText = text;
                                    ele.setAttribute('value', val);
									ele.innerText = text;
									if(callback)
                                    	callback({ value: val, text: text });
                                }
                                q('body').removeEventListener('click', wait);
                                q('body').removeAttribute('set');
                            }
                            if (!q('body').hasAttribute('set')) {
                                e.stopImmediatePropagation()
                                q('body').addEventListener('click', wait);
                                q('body').setAttribute('set', true);
                            }
                        }
                    }),
                dm.div({ class: 'drop-content dispnone' }, [
                    values.map(el => dm.a({ 'value2':'2','value': el.value || 'None', 'text': el.text || 'None' }, [el.text || 'None']))
                ])
            ])
        ]);
        this.content.appendChild(dropdown);
	}
	
	retrieve(){
        return {
            text : this.content.querySelector('.update-div').getAttribute('text'),
            value: this.content.querySelector('.update-div').getAttribute('value')
        }
    }
    
    flash(value){
        this.content.querySelector('.update-div').setAttribute('value', value);
        for(let val of this.values){
            if(val.value == value){
                this.content.querySelector('.update-div').setAttribute('text', val.text);
                this.content.querySelector('.update-div').innerText = val.text;
            }
        }
    }
}

customElements.define('drop-down', Dropdown);

class Zip {

    static gen(type, content) {
        document.body.appendChild(
            dom.div({ class: `${type}Notify notify` }, [
                dom.div({ class: 'row' }, [
                    dom.div({ class: 'col two' }, [
                        dom.i({ class: `fa fa-${(type == 'error') ? 'exclamation-triangle' : (type == 'success') ? 'check' : 'info'}`, style: 'font-size: 30px;position:relative;left:20px;top:10px' })
                    ]),
                    dom.div({ class: 'col eight' }, [
                        dom.p({ style: 'font-size:17px' }, [content])
                    ])
                ])
            ], {
                    after: function (el) {
                        setTimeout(function () {
                            el.remove();
                        }, 3000);
                    }
                })
        );
    }
}