let id = selector => document.getElementById(selector);
let q = selector => document.querySelector(selector);
let qa = selector => document.querySelectorAll(selector);

let insertAfter = (newNode, referenceNode) => referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);

let Monster = new function(){
	let monster = this;
	monster.cookies = {};
	monster.whitelist = {};
	monster.blacklist = {};
	monster.current = {};

	function parse_url(cookie){
		return (cookie.domain.startsWith('.')) ? `https://${cookie.domain.substring(1)}${cookie.path}` : `https://${cookie.domain}${cookie.path}`;
	}

	function make_index(cookie) {
		return parse_url(cookie) + '-' + cookie.name;
	}

	function regularize(cookie){
		var a = document.createElement('a');
		a.href = parse_url(cookie);
		var domain = a.hostname.replace('www.', '');
		return domain + cookie.name;
	}

	function sort_cookies(cookies){
		return monster.cookies.sort((a, b) => (regularize(a) > regularize(b)) ? 1 : (regularize(b) > regularize(a)) ? -1 : 0);
	}

	monster.next_whitelist = _ =>
	{
		let highest = 0;
		for(let key in monster.whitelist.custom){
			if(key >= highest)
				highest = key + 1;
		}
		return highest;
	}

	monster.next_blacklist = _ =>
	{
		let highest = 0;
		for(let key in monster.blacklist.custom){
			if(key >= highest)
				highest = key + 1;
		}
		return highest;
	}

	monster.create_cookie = ({url, name, value, domain = false, secure = false, httpOnly = false, expiration = false}) =>
	{
		var cookie = {
			url: url,
			name: name,
			value: value,
			secure: secure,
			httpOnly: httpOnly
		}
		var a = document.createElement('a');
		a.href = url;
		if(domain)
			cookie.domain = a.hostname;
		cookie.path = a.pathname;
		if (expiration){
			cookie.expirationDate = expiration;
			cookie.session = false;
		}
		else {
			cookie.session = true;
		}
		return cookie;
	}

	monster.remove_cookies = cookies =>
	{
		console.log('removal');
		port.postMessage({
			type: 'remove-cookie',
			data: cookies
		});
	}

	monster.edit_cookie = (old_cookie, new_cookie) =>
	{
		let obj = {
			removal: old_cookie,
			add: new_cookie
		};
		port.postMessage({
			type: 'edit',
			data: obj
		});
	}

	function input_changed() {
		var total = 0;
		qa('.selected-cookie').forEach(el => {
			if (el.checked)
				total++;
		});

		id('total-selected').innerText = `${total} selected`;
		if (total > 0) {
			if (total == 1)
				id('edit-selected').classList.remove('disabled-button');
			else
				id('edit-selected').classList.add('disabled-button');
			id('remove-selected').classList.remove('disabled-button');
		}
		else {
			id('edit-selected').classList.add('disabled-button');
			id('remove-selected').classList.add('disabled-button');
		}
	}

	monster.load_cookies = cookies =>
	{
		id('cookie-table').innerHTML = "";
		monster.cookies = {};
		for(let cookie of cookies){
			let _cookie = Object.assign({},cookie);
			_cookie.index = make_index(_cookie);
			_cookie.url = parse_url(_cookie);
			monster.cookies[_cookie.index] = _cookie;
			id('cookie-table').appendChild(Htmlgen.cookie_row(_cookie));
		}
		input_changed();
	}

	monster.add_cookie = cookie =>
	{
		let _cookie = Object.assign({},cookie);
		_cookie.index = make_index(_cookie);
		_cookie.url = parse_url(_cookie);
		monster.cookies[_cookie.index] = _cookie;
		let row = Htmlgen.cookie_row(_cookie);
		if(id(_cookie.index)){
			id(_cookie.index).replaceWith(row);
		}
		else {
			id('cookie-table').appendChild(row);
		}
		input_changed();
		var search = id('search-input').value;
		var filtered = [];
		for (let selection of qa('.filtered'))
			filtered.push(selection.textContent);
		var filteredOut = false;
		for (let selection of filtered)
			if (!_cookie[selection])
				filteredOut = true;
		if (filteredOut) {
			row.style.display = "none";
		}
		else {
			if (search == "")
				row.style.display = "";
			else
				if (row.innerText.toLowerCase().indexOf(search.toLowerCase()) == -1)
					row.style.display = "none";
				else
					row.style.display = "";
		}
	}

	monster.remove_cookie = cookie =>
	{
		let index = make_index(cookie);
		if(id(index)){
			id(index).remove();
		}
	}

	monster.remove_all = _ =>
	{
		port.postMessage({
			type: 'remove-all'
		});
	}

	let port = chrome.runtime.connect({name: 'full'});
	
	function handle_message(message){
		if(message.type == 'load')
			monster.load_cookies(message.data);
		if(message.type == 'cookie-add')
			monster.add_cookie(message.data);
		if(message.type == 'cookie-remove')
			monster.remove_cookie(message.data);
	}

	port.onMessage.addListener(handle_message);

	port.postMessage({
		type: 'initial-load'
	});

	monster.updates_made = _ =>
	{
		port.postMessage({
			type: 'updates',
			data: {
				whitelist: monster.whitelist,
				blacklist: monster.blacklist,
				current: monster.current
			}
		});
	}
}

let Htmlgen = new function(){
	let html = this;

	html.main_nav = _ =>
	{
		function show(el){
			el.classList.remove('dispnone');
		}

		function hide(el){
			el.classList.add('dispnone');
		}

		function nav_switched(){
			qa('.nav-button').forEach(el => el.classList.remove('nav-filtered'));
			this.classList.add('nav-filtered');
			if(this.classList.contains('whitelist-page')){
				show(id('blackwhitelist'));
				hide(id('main-content'));
			}
			else {
				show(id('main-content'));
				hide(id('blackwhitelist'));
			}
		}

		return dom.div({style:'width: 80%;margin:0 auto;'},[
			dom.div({class:'row', style:'box-shadow: 0 0 5px'},[
				dom.div({class:'col fourth'},[
					dom.span({class: 'button nav-filtered nav-button main-page', style:'width:100%; border-radius: 0px; border-top:0px; cursor: pointer'},['Cookie List'],{click: nav_switched})
				]),
				dom.div({class:'col fourth'},[
					dom.span({ class: 'button nav-button whitelist-page', style: 'width:100%; border-radius: 0px; border-top:0px; cursor: pointer' }, ['Whitelist/Blacklist'], { click: nav_switched })
				]),
				dom.div({class:'col fourth'},[
					dom.span({ class: 'button nav-button', style: 'width:100%; border-radius: 0px; border-top:0px; cursor: pointer' }, ['Stats'], { click: nav_switched })
				]),
				dom.div({class:'col fourth'},[
					dom.span({ class: 'button nav-button', style: 'width:100%; border-radius: 0px; border-top:0px; cursor: pointer' }, ['About'], { click: nav_switched })
				])
			])
		]);
	}

	html.main_page = _ =>
	{
		function filters_changed(){
			var ele = this;
			console.log(ele);
			if (ele.classList.contains('filtered'))
				ele.classList.remove('filtered');
			else
				ele.classList.add('filtered');
			search_change();
		}

		function search_change(){
			var search = id('search-input').value;
			var filtered = [];
			for (let selection of qa('.filtered'))
				filtered.push(selection.textContent);
			for (let row of qa('.cookie-row')) {
				var data = Monster.cookies[row.id];
				var filteredOut = false;
				for (let selection of filtered)
					if (!data[selection])
						filteredOut = true;
				if (filteredOut) {
					row.style.display = "none";
				}
				else {
					if (search == "")
						row.style.display = "";
					else
						if (row.innerText.toLowerCase().indexOf(search.toLowerCase()) == -1)
							row.style.display = "none";
						else
							row.style.display = "";
				}
			}
			if (!search)
				id('clear-search').style.display = "none";
			else
				id('clear-search').style.display = "inline-block";
		}

		function edit_selected(){
			var selected;
			qa('.selected-cookie').forEach(el => {
				if (el.checked)
					selected = el.parentElement.parentElement;
			});
			document.body.appendChild(Htmlgen.edit_cookie(Monster.cookies[selected.id]));
		}

		function remove_selected(){
			var cookies = [];
			qa('.selected-cookie').forEach(el => {
				if (el.checked) {
					cookies.push(Monster.cookies[el.parentElement.parentElement.id]);
					console.log(el);
				}
			});
			console.log(cookies);
			Monster.remove_cookies(cookies);
		}

		function remove_all(){
			Monster.remove_all();
		}

		function clear_search(){
			id('search-input').value = "";
			id('clear-search').style.display = "none";
			search_change();
		}

		function new_cookie(){
			function cancel_popup() {
				q('.overlay').remove();
			}

			function save_edit() {
				var obj = {
					url: id('input-url').value,
					name: id('input-name').value,
					value: id('input-value').value
				};
				var a = document.createElement('a');
				a.href = obj.url;
				if (!id('input-hostOnly').checked)
					obj.domain = a.hostname;
				if (a.pathname)
					obj.path = a.pathname;
				if (id('input-secure').checked)
					obj.secure = true;
				if (id('input-httpOnly').checked)
					obj.httpOnly = true;
				if (!id('input-session').checked) {
					var year = id('input-year').value;
					var month = id('input-month').value;
					var day = id('input-day').value;
					var time = new Date(year, month - 1, day).getTime() / 1000;
					obj.expirationDate = time;
				}
				Monster.edit_cookie({url:'',name:''}, obj);
				cancel_popup();
			}

			function session_clicked() {
				if (this.checked) {
					id('input-month').value = "";
					id('input-day').value = "";
					id('input-year').value = "";
					id('input-month').classList.add('disabledSession');
					id('input-day').classList.add('disabledSession');
					id('input-year').classList.add('disabledSession');
				}
				else {
					id('input-month').classList.remove('disabledSession');
					id('input-day').classList.remove('disabledSession');
					id('input-year').classList.remove('disabledSession');
				}
			}

			function input_changed() {
				if (id('input-session').checked) {
					if (!id('input-url').value || !id('input-name').value || !id('input-value').value)
						id('save-edit').classList.add('disabled-button');
					else
						id('save-edit').classList.remove('disabled-button');
				}
				else {
					if (!parseInt(id('input-year').value) || !parseInt(id('input-month').value) || !parseInt(id('input-day').value) || !id('input-url').value || !id('input-name').value || !id('input-value').value) {
						id('save-edit').classList.add('disabled-button');
					}
					else
						id('save-edit').classList.remove('disabled-button');
				}
			}

			var ele = dom.div({ class: 'overlay' }, [
				dom.div({ class: 'popup', style: 'background: white;' }, [
					dom.div({ class: 'row' }, [
						dom.div({ class: 'container' }, [
							dom.div({ class: 'row' }, [
								dom.div({ style: 'text-align: center; font-size: 24px;margin-bottom: 30px;' }, ['Edit Cookie'])
							]),
							dom.div({ class: 'row' }, [
								dom.div({ class: 'col two' }, ['&nbsp;']),
								dom.div({ class: 'col one' }, ['Url']),
								dom.div({ class: 'col seven' }, [
									dom.input({ type: 'text', id: 'input-url', placeholder: 'https://example.com/cookie', style: 'width: 300px' }, [], { change: input_changed })
								])
							]),
							dom.div({ class: 'row' }, [
								dom.div({ class: 'col two' }, ['&nbsp;']),
								dom.div({ class: 'col one' }, ['Name']),
								dom.div({ class: 'col seven' }, [
									dom.input({ type: 'text', id: 'input-name', placeholder: 'Cookie Name', style: 'width: 300px' }, [], { change: input_changed })
								])
							]),
							dom.div({ class: 'row' }, [
								dom.div({ class: 'col two' }, ['&nbsp;']),
								dom.div({ class: 'col one' }, ['Value']),
								dom.div({ class: 'col seven' }, [
									dom.textarea({ type: 'text', id: 'input-value', placeholder: 'Cookie Value', style: 'width: 300px; height: 100px' }, [], { change: input_changed })
								])
							]),
							dom.div({ class: 'row' }, [
								dom.div({ class: 'col two' }, ['&nbsp;']),
								dom.div({ class: 'col one' }, ['Expiration']),
								dom.div({ class: 'col seven' }, [
									dom.input({ type: 'number', id: 'input-month', placeholder: 'month', style: 'margin-left:20px;width: 50px;' }, [], { change: input_changed }),
									dom.input({ type: 'number', id: 'input-day', placeholder: 'day', style: 'margin-left:20px;width: 50px;' }, [], { change: input_changed }),
									dom.input({ type: 'number', id: 'input-year', placeholder: 'year', style: 'margin-left:20px;width: 100px;' }, [], { change: input_changed })
								])
							]),
							dom.div({ class: 'row' }, [
								['httpOnly', 'hostOnly', 'secure', 'session'].map(type =>
									dom.div({ class: 'col fourth' }, [
										(function () {
											if (type == 'session')
												var params = { 'click': session_clicked, change: input_changed };
											else
												var params = { change: input_changed };
											return dom.input({ id: `input-${type}`, type: 'checkbox' }, [], params);
										})(),
										dom.span({ style: 'margin-left:10px' }, [type])
									])
								)
							]),
							dom.div({ class: 'row', style: 'margin-top:50px' }, [
								dom.button({ id: 'cancel-edit', class: 'button', style: 'float: left' }, ['Cancel'], { 'click': cancel_popup }),
								dom.button({ id: 'save-edit', class: 'button disabled-button', style: 'float: right' }, ['Save'], { 'click': save_edit })
							])
						])
					])
				])
			]);
			document.body.appendChild(ele);
		}

 		return dom.div({ class: 'container' }, [
			dom.div({ class: 'row' }, [
				dom.div({ class: 'col two' }, [
					dom.input({ type: 'text', id: 'search-input', placeholder: 'Enter search term...', style: 'width: 200px' }, [], { 'input': search_change }),
					dom.i({ class: 'fa fa-times', id: 'clear-search', style: 'color: red; font-size: 20px; position: relative; top: 3px; cursor: pointer; display: none;left:5px' }, [], { 'click': clear_search })
				]),
				dom.div({ class: 'col eight' }, [
					dom.div({ class: 'row' }, [
						dom.div({ class: 'col fourth' }, [
							dom.span({ class: 'button filter-select' }, ['hostOnly'], { 'click': filters_changed })
						]),
						dom.div({ class: 'col fourth' }, [
							dom.span({ class: 'button filter-select' }, ['httpOnly'], { 'click': filters_changed })
						]),
						dom.div({ class: 'col fourth' }, [
							dom.span({ class: 'button filter-select' }, ['secure'], { 'click': filters_changed })
						]),
						dom.div({ class: 'col fourth' }, [
							dom.span({ class: 'button filter-select' }, ['session'], { 'click': filters_changed })
						])
					])
				])
			]),
			dom.div({ class: 'row', style: 'height: 700px; position: fixed; bottom: 130px; width: 80%;' }, [
				dom.div({ class: 'row', style: 'border-bottom: 1px solid #aaa;font-size:20px;' }, [
					dom.div({ class: 'col pointfive' }, ['&nbsp;']),
					dom.div({ class: 'col onepointfive' }, ['Domain']),
					dom.div({ class: 'col three' }, ['Name']),
					dom.div({ class: 'col five' }, ['Value'])
				]),
				dom.div({ id: 'cookie-table', class: 'row vscroll', style: 'height: 700px;' })
			]),
			dom.div({ class: 'row', style: 'position: fixed; bottom: 0; height: 60px; width: 80%;' }, [
				dom.div({ class: 'col one' }, [
					dom.span({ id: 'total-selected', class: 'button', style: 'border: none; cursor: default;' }, ['0 Selected'])
				]),
				dom.div({ class: 'col one' }, [
					dom.button({ id: 'edit-selected', class: 'disabled-button button' }, ['Edit Selected'], { 'click': edit_selected })
				]),
				dom.div({ class: 'col one' }, ['&nbsp']),
				dom.div({ class: 'col one' }, [
					dom.button({ id: 'new-cookie', class: 'button' }, ['New Cookie'], { 'click': new_cookie })
				]),
				dom.div({ class: 'col three' }, ['&nbsp;']),
				dom.div({ class: 'col two' }, [
					dom.button({ id: 'remove-selected', class: 'disabled-button button' }, ['Remove Selected'], { 'click': remove_selected }),
				]),
				dom.div({ class: 'col one' }, [
					dom.button({ id: 'remove-all', class: 'button' }, ['Remove All'], { 'click': remove_all})
				])
			])
		]);
	}

	html.cookie_row = cookie =>
	{
		function input_changed(){
			var total = 0;
			qa('.selected-cookie').forEach(el => {
				if (el.checked)
					total++;
			});

			id('total-selected').innerText = `${total} selected`;
			if (total > 0) {
				if (total == 1)
					id('edit-selected').classList.remove('disabled-button');
				else
					id('edit-selected').classList.add('disabled-button');
				id('remove-selected').classList.remove('disabled-button');
			}
			else {
				id('edit-selected').classList.add('disabled-button');
				id('remove-selected').classList.add('disabled-button');
			}
		}

		var domain;
		cookie.domain.startsWith('.') ? domain = cookie.domain.substring(1) : domain = cookie.domain;
		domain.startsWith('www') ? domain = domain.substring(4) : domain = domain;
		return dom.div({ class: 'row cookie-row', id: cookie.index }, [
			dom.div({ class: 'col pointfive' }, [
				dom.input({ type: 'checkbox', class: 'selected-cookie' }, [], { 'change': input_changed })
			]),
			dom.div({ class: 'col onepointfive' }, [
				dom.div({ class: 'nowrap' }, [domain])
			]),
			dom.div({ class: 'col three' }, [
				dom.div({ class: 'nowrap' }, [cookie.name])
			]),
			dom.div({ class: 'col five' }, [
				dom.div({ class: 'nowrap' }, [cookie.value])
			])
		])
	}

	html.edit_cookie = cookie =>
	{
		function cancel_popup(){
			q('.overlay').remove();
		}

		function save_edit(){
			var obj = {
				url: id('input-url').value,
				name: id('input-name').value,
				value: id('input-value').value
			};
			var a = document.createElement('a');
			a.href = obj.url;
			if (!id('input-hostOnly').checked)
				obj.domain = a.hostname;
			if (a.pathname)
				obj.path = a.pathname;
			if (id('input-secure').checked)
				obj.secure = true;
			if (id('input-httpOnly').checked)
				obj.httpOnly = true;
			if (!id('input-session').checked) {
				var year = id('input-year').value;
				var month = id('input-month').value;
				var day = id('input-day').value;
				var time = new Date(year, month - 1, day).getTime() / 1000;
				obj.expirationDate = time;
			}
			Monster.edit_cookie(Monster.cookies[q('.overlay').dataset.index], obj);
			cancel_popup();
		}

		function session_clicked(){
			if (this.checked) {
				id('input-month').value = "";
				id('input-day').value = "";
				id('input-year').value = "";
				id('input-month').classList.add('disabledSession');
				id('input-day').classList.add('disabledSession');
				id('input-year').classList.add('disabledSession');
				id('save-edit').classList.remove('disabled-button');
			}
			else {
				id('input-month').classList.remove('disabledSession');
				id('input-day').classList.remove('disabledSession');
				id('input-year').classList.remove('disabledSession');
			}
		}

		function input_changed(){
			if(id('input-session').checked){
				if (!id('input-url').value || !id('input-name').value || !id('input-value').value)
					id('save-edit').classList.add('disabled-button');
				else
					id('save-edit').classList.remove('disabled-button');
			}
			else {
				if (!parseInt(id('input-year').value) || !parseInt(id('input-month').value) || !parseInt(id('input-day').value) || !id('input-url').value || !id('input-name').value || !id('input-value').value) {
					id('save-edit').classList.add('disabled-button');
				}
				else
					id('save-edit').classList.remove('disabled-button');
			}
		}

		return dom.div({ class: 'overlay', 'data-index': cookie.index }, [
			dom.div({ class: 'popup', style: 'background: white;' }, [
				dom.div({ class: 'row' }, [
					dom.div({ class: 'container' }, [
						dom.div({ class: 'row' }, [
							dom.div({ style: 'text-align: center; font-size: 24px;margin-bottom: 30px;' }, ['Edit Cookie'])
						]),
						dom.div({ class: 'row' }, [
							dom.div({ class: 'col two' }, ['&nbsp;']),
							dom.div({ class: 'col one' }, ['Url']),
							dom.div({ class: 'col seven' }, [
								dom.input({ type: 'text', id: 'input-url', placeholder: 'https://example.com/cookie', value: cookie.url, style: 'width: 300px' },[],{change:input_changed})
							])
						]),
						dom.div({ class: 'row' }, [
							dom.div({ class: 'col two' }, ['&nbsp;']),
							dom.div({ class: 'col one' }, ['Name']),
							dom.div({ class: 'col seven' }, [
								dom.input({ type: 'text', id: 'input-name', placeholder: 'Cookie Name', value: cookie.name, style: 'width: 300px' },[],{change:input_changed})
							])
						]),
						dom.div({ class: 'row' }, [
							dom.div({ class: 'col two' }, ['&nbsp;']),
							dom.div({ class: 'col one' }, ['Value']),
							dom.div({ class: 'col seven' }, [
								dom.textarea({ type: 'text', id: 'input-value', placeholder: 'Cookie Value', value: cookie.value, style: 'width: 300px; height: 100px' }, [cookie.value],{change:input_changed})
							])
						]),
						dom.div({ class: 'row' }, [
							dom.div({ class: 'col two' }, ['&nbsp;']),
							dom.div({ class: 'col one' }, ['Expiration']),
							(function(){
								if (!cookie.session) {
									var date = new Date(1000 * cookie.expirationDate);
									return dom.div({ class: 'col seven' }, [
										dom.input({ type: 'number', id: 'input-month', placeholder: 'month', style: 'margin-left:20px;width: 50px;', value: date.getMonth() + 1 },[],{change: input_changed}),
										dom.input({ type: 'number', id: 'input-day', placeholder: 'day', style: 'margin-left:20px;width: 50px;', value: date.getDate() }, [], { change: input_changed }),
										dom.input({ type: 'number', id: 'input-year', placeholder: 'year', style: 'margin-left:20px;width: 100px;', value: date.getFullYear() }, [], { change: input_changed })
									])
								}
								else {
									return dom.div({ class: 'col seven' }, [
										dom.input({ type: 'number', id: 'input-month', placeholder: 'month', style: 'margin-left:20px;width: 50px;', class: 'disabledSession' }, [], { change: input_changed }),
										dom.input({ type: 'number', id: 'input-day', placeholder: 'day', style: 'margin-left:20px;width: 50px;', class: 'disabledSession' }, [], { change: input_changed }),
										dom.input({ type: 'number', id: 'input-year', placeholder: 'year', style: 'margin-left:20px;width: 100px;', class: 'disabledSession' }, [], { change: input_changed })
									])
								}
							})()
						]),
						dom.div({ class: 'row' }, [
							['httpOnly', 'hostOnly', 'secure', 'session'].map(type =>
								dom.div({ class: 'col fourth' }, [
									(function(){
										var checked = cookie[type];
										if (type == 'session')
											var params = { 'click': session_clicked, change: input_changed };
										else
											var params = { change: input_changed };
										if (checked)
											return dom.input({ id: `input-${type}`, type: 'checkbox', checked: true }, [], params);
										else
											return dom.input({ id: `input-${type}`, type: 'checkbox' }, [], params);
									})(),
									dom.span({ style: 'margin-left:10px' }, [type])
								])
							)
						]),
						dom.div({ class: 'row', style: 'margin-top:50px' }, [
							dom.button({ id: 'cancel-edit', class: 'button', style: 'float: left' }, ['Cancel'], { 'click': cancel_popup }),
							dom.button({ id: 'save-edit', class: 'button', style: 'float: right' }, ['Save'], { 'click': save_edit})
						])
					])
				])
			])
		]);
	}

	html.whitelist_page = _ =>
	{
		var values = [
			{
				text: 'Blacklist',
				value: 'blacklist'
			},
			{
				text: 'Whitelist',
				value: 'whitelist'
			}
		];

		var allow_interception_values = [
			{
				text: 'Allow',
				value: 'allow'
			},
			{
				text: 'Remove',
				value: 'remove'
			},
			{
				text: 'Poison',
				value: 'poison'
			},
			{
				text: 'Swap',
				value: 'swap'
			}
		];

		var remove_interception_values = [
			{
				text: 'Remove',
				value: 'remove'
			},
			{
				text: 'Allow',
				value: 'allow'
			},
			{
				text: 'Poison',
				value: 'poison'
			},
			{
				text: 'Swap',
				value: 'swap'
			}
		];

		var blacklist_interception_values = [
			{
				text: 'Remove',
				value: 'remove'
			},
			{
				text: 'Poison',
				value: 'poison'
			},
			{
				text: 'Swap',
				value: 'swap'
			}
		]
		
		let initial_whitelist = JSON.parse(JSON.stringify(Monster.whitelist));

		let initial_blacklist = JSON.parse(JSON.stringify(Monster.blacklist));

		function compare(){
			if(JSON.stringify(initial_whitelist) == JSON.stringify(Monster.whitelist))
				q('.save-button').classList.add('disabled-button');
			else
				q('.save-button').classList.remove('disabled-button');
		}

		function compare2() {
			if (JSON.stringify(initial_blacklist) == JSON.stringify(Monster.blacklist))
				q('.blsave-button').classList.add('disabled-button');
			else
				q('.blsave-button').classList.remove('disabled-button');
		}

		return dom.div({style:'width: 80%;margin: 0 auto'},[
			dom.div({class: 'row'},[
				dom.div({class: 'col three'},[
					dom.div({class:'row'},[
						dom.div({class: 'col five',style:'text-align:right'},[
							dom.span({style:'font-size: 30px; font-weight: bold;margin-right:20px'},['Mode:'])
						]),
						dom.div({class: 'col five'},[
							new Dropdown({buttonid: 'mode', values: values, callback: function(response){
								id('list-setting').innerHTML = response.text;
								qa('.paragraph-setting').forEach(el => el.classList.add('dispnone'));
								q(`.${response.value}-paragraph-setting`).classList.remove('dispnone');
								qa('.list-sec').forEach(el => el.classList.add('dispnone'));
								id(response.value).classList.remove('dispnone');
								Monster.current = response.value;
								locker.saveFile('/lists', JSON.stringify({ whitelist: Monster.whitelist, blacklist: Monster.blacklist, current: Monster.current }), function () {
									Monster.updates_made();
								})
							}})
						],{
							after: function(el){
								el.children[0].flash(Monster.current);
							}
						})
					])
				])
			]),
			dom.div({class:'row', style: 'margin-top: 30px'},[
				dom.span({id:'list-setting',style:'font-size:22px'},[
					Monster.current == 'whitelist' ? 'Whitelist' : 'Blacklist'
				])
			]),
			dom.div({class:'row'},[
				dom.div({id: 'paragraph-setting', style:'font-size: 16px'},[
					dom.p({ class: 'paragraph-setting blacklist-paragraph-setting'},[
						'Blacklist is the default setting. When using the blacklist, all cookies by default are allowed. Only cookies from domains that you specifically add to the blacklist are intercepted and then removed/poisoned/swapped based on the setting you specify. This mode is easier to configure and more reliable at ensuring the extension does not interfere with sign-ins. However, it is less effective at protecting your privacy.'
					]),
					dom.p({ class: 'paragraph-setting whitelist-paragraph-setting dispnone'},[
						'Whitelist is the secondary setting. When using the whitelist, all cookies are blocked by default. Only cookies from domains that you specifically add to the whitelist are not intercepted. All others are removed/poisoned/swapped based on the setting you specify. This mode requires that you whitelist the necessary domains for websites you use which set the cookies that allow you to "sign in" and stay "signed in" for that website. If you do not whitelist the appropriate domains, you will not be able to sign into that website. However, if used correctly, this mode completely eliminates cookie based tracking.'
					])
				],{
					after: function(el){
						el.querySelectorAll('.paragraph-setting').forEach(el => el.classList.add('dispnone'));
						el.querySelector(`.${Monster.current}-paragraph-setting`).classList.remove('dispnone');
					}
				})
			]),
			dom.div({class:'row'},[
				dom.span({style:'font-size:22px'},['Interception Settings'])
			]),
			dom.div({class:'row',style:'font-size:16px'},[
				dom.ul([
					dom.li(['Remove: Delete the cookie as its set (Eliminates tracking)']),
					dom.li(['Poison: Set the value of the cookie to a random value in the same format (Eliminates tracking and can poison the accuracy of determining your online identity)']),
					dom.li(["Swap: Swap your cookie's value with someone else's (Eliminates tracking and destroys the ability to determine your online identity) **never use for session or authentication cookies**"])
				])
			]),
			dom.div({id:`whitelist`, class: 'dispnone list-sec'},[
				dom.div({class: 'row'},[
					dom.div({class: 'col seven'},[
						dom.div({class:'row', style: 'border-bottom: 2px solid #CCC'},[
							dom.div({class:'col seven'},[
								dom.span({style: 'font-size: 22px; font-weight:bold'},['Domain'])
							]),
							dom.div({class:'col two'},[
								dom.span({ style: 'font-size: 22px; font-weight:bold' },['Interception Method'])
							])
						]),
						dom.div({ id: 'interception-list'},[
							dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC'}, [
								dom.div({ class: 'col seven'}, [
									dom.span({ style: 'font-size: 18px' },['Whitelisted Domains']),
									dom.div([
										dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"', value: Monster.whitelist.default.domains }, [Monster.whitelist.default.domains],{
											input: function(){
												Monster.whitelist.default.domains = this.value;
												compare();
											}
										})
									])
								]),
								dom.div({ class: 'col two'}, [
									dom.div({style:'padding:20px'},[
										new Dropdown({buttonid:'non-whitelisted',values: [{text: 'Allow', value: 'allow'}], callback: function(response){
											Monster.whitelist.default.method = response.value;
											compare();
										}})
									],{
										after: function (el) {
											el.children[0].flash(Monster.whitelist.default.method);
										}
									})
								])
							]),
							Object.entries(Monster.whitelist.custom).map(list_rule => 
								dom.div({ id: `inter-${list_rule[0]}`, class: 'row interception-row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
									dom.div({ class: 'col seven' }, [
										dom.input({ style: 'font-size: 18px; border: none; border-bottom: 2px solid rgb(55,54,59);outline: none;margin-bottom: 10px;', value: list_rule[1].name }, [], {
											input: function(){
												Monster.whitelist.custom[list_rule[0]].name = this.value;
												compare();
											}
										}),
										dom.div([
											(function(){
												console.log(list_rule);
											return dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"', value: list_rule[1].domains }, [list_rule[1].domains], {
												input: function(){
													Monster.whitelist.custom[list_rule[0]].domains = this.value;
													compare();
												}
											})
											})()
										])
									]),
									dom.div({ class: 'col two' }, [
										dom.div({ style: 'padding:20px' }, [
											new Dropdown({ buttonid: 'non-whitelisted', values: allow_interception_values, callback: function(response){
												Monster.whitelist.custom[list_rule[0]].method = response.value;
												compare();
											} })
										],{
											after: function(el){
												el.children[0].flash(list_rule[1].method);
											}
										})
									]),
									dom.div({ class: 'col one' }, [
										dom.div({ style: 'padding:30px' }, [
											dom.i({ class: 'fa fa-remove', style: 'font-size: 30px; color: red; cursor: pointer' }, [], {
												click: function () {
													id(`inter-${list_rule[0]}`).remove();
													delete Monster.whitelist.custom[list_rule[0]];
													compare();
												}
											})
										])
									])
								])
							)
						]),
						dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
							dom.div({ class: 'col seven' }, [
								dom.span({ style: 'font-size: 18px' }, ['All Other Domains'])
							]),
							dom.div({ class: 'col two'}, [
								dom.div({ style: 'padding:20px' }, [
									new Dropdown({ buttonid: 'non-whitelisted', values: blacklist_interception_values, callback: function(response){
										Monster.whitelist.other.method = response.value;
										compare();
									} })
								],{
									after: function(el){
										el.children[0].flash(Monster.whitelist.other.method);
									}
								})
							])
						]),
						dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;'},[
							dom.div({class:'col five'},[
								'&nbsp;'
							]),
							dom.div({class: 'col two'},[
								dom.div({ style: 'padding:20px' }, [
									dom.div({class:'button add-button'},[
										dom.span({style:'font-size:22px;margin-right:10px'},['Add row']),
										dom.i({class:'fa fa-plus', style:'font-size:22px'},[])
									],{
										click: function(){

											function name_changed(){
												Monster.whitelist.custom[next].name = this.value;
												compare();
											}

											function method_changed(result){
												Monster.whitelist.custom[next].method = result.value;
												compare();
											}

											function domains_changed(){
												Monster.whitelist.custom[next].domains = this.value;
												compare();
											}

											let next = Monster.next_whitelist();
											var inter_id = `inter-${next}`;
											id('interception-list').appendChild(
												dom.div({ id: inter_id, class: 'row interception-row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
													dom.div({ class: 'col seven' }, [
														dom.input({ style: 'font-size: 18px; border: none; border-bottom: 2px solid rgb(55,54,59);outline: none;margin-bottom: 10px;', value: 'Enter list name' }, [], {input: name_changed}),
														dom.div([
															dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"' },[],{input: domains_changed})
														])
													]),
													dom.div({ class: 'col two' }, [
														dom.div({ style: 'padding:20px' }, [
															new Dropdown({ buttonid: 'non-whitelisted', values: blacklist_interception_values, callback: method_changed })
														])
													]),
													dom.div({ class: 'col one'},[
														dom.div({style: 'padding:30px'},[
															dom.i({class: 'fa fa-remove', style: 'font-size: 30px; color: red; cursor: pointer'},[],{
																click: function(){
																	id(inter_id).remove();
																	delete Monster.whitelist.custom[next];
																}
															})
														])
													])
												])
											);

											Monster.whitelist.custom[next] = {
												name: 'Enter list name',
												domains: '',
												method: 'allow'
											}
										}
									})
								])
							]),
							dom.div({ class: 'col two' }, [
								dom.div({ style: 'padding:20px' }, [
									dom.div({ class: 'button save-button disabled-button' }, [
										dom.span({ style: 'font-size:22px;margin-right:10px' }, ['Save Changes']),
										dom.i({ class: 'fa fa-save', style: 'font-size:22px' }, [])
									],{
										click: function(){
											locker.saveFile('/lists', JSON.stringify({whitelist: Monster.whitelist, blacklist: Monster.blacklist, current: Monster.current}), function(){
												Zip.gen('info',`Changes saved successfully.`);
												initial_whitelist = JSON.parse(JSON.stringify(Monster.whitelist));
												q('.save-button').classList.add('disabled-button');
												Monster.updates_made();
											})
										}
									})
								])
							])
						])
					])
				])
			]),
			dom.div({id:'blacklist', class: 'list-sec'},[
				dom.div({ class: 'row' }, [
					dom.div({ class: 'col seven' }, [
						dom.div({ class: 'row', style: 'border-bottom: 2px solid #CCC' }, [
							dom.div({ class: 'col seven' }, [
								dom.span({ style: 'font-size: 22px; font-weight:bold' }, ['Domain'])
							]),
							dom.div({ class: 'col two' }, [
								dom.span({ style: 'font-size: 22px; font-weight:bold' }, ['Interception Method'])
							])
						]),
						dom.div({ id: 'blinterception-list' }, [
							dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
								dom.div({ class: 'col seven' }, [
									dom.span({ style: 'font-size: 18px' }, ['Blacklisted Domains']),
									dom.div([
										dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"', value: Monster.blacklist.default.domains }, [Monster.blacklist.default.domains], {
											input: function () {
												Monster.blacklist.default.domains = this.value;
												compare2();
											}
										})
									])
								]),
								dom.div({ class: 'col two' }, [
									dom.div({ style: 'padding:20px' }, [
										new Dropdown({
											buttonid: 'non-blacklisted', values: blacklist_interception_values, callback: function (response) {
												Monster.blacklist.default.method = response.value;
												compare2();
											}
										})
									], {
											after: function (el) {
												el.children[0].flash(Monster.blacklist.default.method);
											}
										})
								])
							]),
							Object.entries(Monster.blacklist.custom).map(list_rule =>
								dom.div({ id: `inter-${list_rule[0]}`, class: 'row interception-row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
									dom.div({ class: 'col seven' }, [
										dom.input({ style: 'font-size: 18px; border: none; border-bottom: 2px solid rgb(55,54,59);outline: none;margin-bottom: 10px;', value: list_rule[1].name }, [], {
											input: function () {
												Monster.blacklist.custom[list_rule[0]].name = this.value;
												compare2();
											}
										}),
										dom.div([
											(function () {
												console.log(list_rule);
												return dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"', value: list_rule[1].domains }, [list_rule[1].domains], {
													input: function () {
														Monster.blacklist.custom[list_rule[0]].domains = this.value;
														compare2();
													}
												})
											})()
										])
									]),
									dom.div({ class: 'col two' }, [
										dom.div({ style: 'padding:20px' }, [
											new Dropdown({
												buttonid: 'non-blacklisted', values: blacklist_interception_values, callback: function (response) {
													Monster.blacklist.custom[list_rule[0]].method = response.value;
													compare2();
												}
											})
										], {
												after: function (el) {
													el.children[0].flash(list_rule[1].method);
												}
											})
									]),
									dom.div({ class: 'col one' }, [
										dom.div({ style: 'padding:30px' }, [
											dom.i({ class: 'fa fa-remove', style: 'font-size: 30px; color: red; cursor: pointer' }, [], {
												click: function () {
													id(`inter-${list_rule[0]}`).remove();
													delete Monster.blacklist.custom[list_rule[0]];
													compare2();
												}
											})
										])
									])
								])
							)
						]),
						dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
							dom.div({ class: 'col seven' }, [
								dom.span({ style: 'font-size: 18px' }, ['All Other Domains'])
							]),
							dom.div({ class: 'col two' }, [
								dom.div({ style: 'padding:20px' }, [
									new Dropdown({
										buttonid: 'non-whitelisted', values: [{text:'Allow',value:'allow'}], callback: function (response) {
											Monster.blacklist.other.method = response.value;
											compare2();
										}
									})
								], {
										after: function (el) {
											el.children[0].flash(Monster.blacklist.other.method);
										}
									})
							])
						]),
						dom.div({ class: 'row', style: 'padding-top: 10px; padding-bottom: 20px;' }, [
							dom.div({ class: 'col five' }, [
								'&nbsp;'
							]),
							dom.div({ class: 'col two' }, [
								dom.div({ style: 'padding:20px' }, [
									dom.div({ class: 'button bladd-button' }, [
										dom.span({ style: 'font-size:22px;margin-right:10px' }, ['Add row']),
										dom.i({ class: 'fa fa-plus', style: 'font-size:22px' }, [])
									], {
											click: function () {

												function name_changed() {
													Monster.blacklist.custom[next].name = this.value;
													compare2();
												}

												function method_changed(result) {
													Monster.blacklist.custom[next].method = result.value;
													compare2();
												}

												function domains_changed() {
													Monster.blacklist.custom[next].domains = this.value;
													compare2();
												}

												let next = Monster.next_blacklist();
												var inter_id = `blinter-${next}`;
												id('blinterception-list').appendChild(
													dom.div({ id: inter_id, class: 'row interception-row', style: 'padding-top: 10px; padding-bottom: 20px;border-bottom: 2px solid #CCC' }, [
														dom.div({ class: 'col seven' }, [
															dom.input({ style: 'font-size: 18px; border: none; border-bottom: 2px solid rgb(55,54,59);outline: none;margin-bottom: 10px;', value: 'Enter list name' }, [], { input: name_changed }),
															dom.div([
																dom.textarea({ style: 'width: 550px; height: 60px', placeholder: 'Enter domains in domain lists separated with ";"' }, [], { input: domains_changed })
															])
														]),
														dom.div({ class: 'col two' }, [
															dom.div({ style: 'padding:20px' }, [
																new Dropdown({ buttonid: 'non-whitelisted', values: blacklist_interception_values, callback: method_changed })
															])
														]),
														dom.div({ class: 'col one' }, [
															dom.div({ style: 'padding:30px' }, [
																dom.i({ class: 'fa fa-remove', style: 'font-size: 30px; color: red; cursor: pointer' }, [], {
																	click: function () {
																		id(inter_id).remove();
																		delete Monster.blacklist.custom[next];
																	}
																})
															])
														])
													])
												);

												Monster.blacklist.custom[next] = {
													name: 'Enter list name',
													domains: '',
													method: id('dd-non-whitelisted').retrieve().value
												}
											}
										})
								])
							]),
							dom.div({ class: 'col two' }, [
								dom.div({ style: 'padding:20px' }, [
									dom.div({ class: 'button blsave-button disabled-button' }, [
										dom.span({ style: 'font-size:22px;margin-right:10px' }, ['Save Changes']),
										dom.i({ class: 'fa fa-save', style: 'font-size:22px' }, [])
									], {
											click: function () {
												locker.saveFile('/lists', JSON.stringify({ whitelist: Monster.whitelist, blacklist: Monster.blacklist, current: Monster.current }), function () {
													Zip.gen('info', `Changes saved successfully.`);
													initial_blacklist = JSON.parse(JSON.stringify(Monster.blacklist));
													q('.blsave-button').classList.add('disabled-button');
													Monster.updates_made();
												})
											}
										})
								])
							])
						])
					])
				])
			])
		],{
			after: function(el){
				el.querySelectorAll('.list-sec').forEach(el => el.classList.add('dispnone'));
				if(Monster.current == 'whitelist'){
					el.querySelector('#whitelist').classList.remove('dispnone');
				}
				else {
					el.querySelector('#blacklist').classList.remove('dispnone');
				}
			}
		})
	}
}

id('main-nav').appendChild(Htmlgen.main_nav());
id('main-content').appendChild(Htmlgen.main_page());
var locker = new FileLocker(true, function(){
	locker.loadFile('/lists', function(response){
		let lists = JSON.parse(response);
		Monster.whitelist = lists.whitelist;
		Monster.blacklist = lists.blacklist;
		Monster.current = lists.current;
		id('blackwhitelist').appendChild(Htmlgen.whitelist_page());
	}, function(){
		locker.saveFile('/lists', JSON.stringify(
			{
				whitelist:{
					default: {
						name: 'Whitelisted Domains',
						domains: '',
						method: 'allow'
					},
					custom: {

					},
					other: {
						name: 'All Other Domains',
						method: 'remove'
					}
				},
				blacklist:{
					default: {
						name: 'Blacklisted Domains',
						domains: '',
						method: 'remove'
					},
					custom: {

					},
					other: {
						name: 'All Other Domains',
						method: 'allow'
					}
				},
				current: "blacklist"
			}
		),
		function(){
			locker.loadFile('/lists', function (response) {
				let lists = JSON.parse(response);
				Monster.whitelist = lists.whitelist;
				Monster.blacklist = lists.blacklist;
				Monster.current = lists.current;
				id('blackwhitelist').appendChild(Htmlgen.whitelist_page());
			});
		}
	);
	});
})
