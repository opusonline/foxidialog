/*!
 * jquery foxidialog 1.0
 * 
 * Copyright 2011, Stefan Benicke (opusonline.at)
 * Dual licensed under the MIT or GPL Version 3 licenses. (LICENSES.txt)
 */
(function($) {
	var $window = $(window),
		$document = $(document),
		$container = $('#foxidialog'),
		$overlay = $('#foxidialog-overlay'),
		$loading = $('#foxidialog-loading'),
		$temp,
		$wrap,
		$title,
		$close,
		$element,
		$inline,
		$buttons,
		current_options,
		current_element,
		container_size,
		namespace = '.foxidialog',
		is_open = false,
		is_image = false,
		preload_image = new Image(),
		inline_regexp = /^#.+/,
		image_regexp = /\.(jpg|gif|png|bmp|jpeg)$/i,
		javascript_regexp = /^javascript:/i,
		percent_regexp = /^(\d+)%$/,
		max = Math.max,
		min = Math.min,
		ajax,
		defaults = {
			speed: 250,
			margin: 30,
			overlayOpacity: 0.4,
			overlayColor: '#222',
			type: '',
			href: '',
			title: '',
			content: '',
			ajax: {},
			buttons: [],
			width: 560,
			height: 340,
			maxWidth: null,
			maxHeight: null,
			autoSize: true,
			onStart: function(){},
			onComplete: function(){},
			onClosed: function(){},
			onCancel: function(){},
			onError: function(){}
		},
		key = {
			esc: 27,
		},
		_getViewport = function() {
			return {
				width: $window.width(),
				height: $window.height(),
				top: $document.scrollTop(),
				left: $document.scrollLeft()
			};
		},
		_keyAction = function(event) {
			if ( ! is_open) return;
			if (event.keyCode == key.esc) {
				event.preventDefault();
				$.foxidialog.close();
			}
		},
		_init = function() {
			var display_none = {display: 'none'};
			if ( ! $container.length) {
				var contents =
					'<div class="head">' +
						'<span class="title"></span>' +
						'<a href="javascript:void(0)" class="close">close</a>' +
					'</div>' +
					'<div class="wrap"/>';
				
				$('body').append(
					$container = $('<div/>').attr('id', 'foxidialog').css(display_none).append(contents),
					$overlay = $('<div/>').attr('id', 'foxidialog-overlay').css(display_none).click($.foxidialog.close),
					$loading = $('<div/>').attr('id', 'foxidialog-loading').css(display_none).click($.foxidialog.cancel),
					$temp = $('<div/>').attr('id', 'foxidialog-temp').css({display: 'none', position: 'absolute', top: 0, left: 0})
				);
			}
			$wrap = $('div.wrap', $container);
			$title = $('span.title', $container);
			$close = $('a.close', $container).click($.foxidialog.close);
			container_size = {
				width: $container.outerWidth(),
				height: $container.outerHeight()
			};
		},
		_start = function() {
			current_options.onStart.call(current_element.pointer);
			_abortAjax();
			is_image = false;
			var source = current_element.source,
				type =
					inline_regexp.test(source) ? 'inline' :
					image_regexp.test(source) ? 'image' :
					current_options.content ? 'html' :
					'ajax';
			if (current_options.type) type = current_options.type;
			if (current_element.is_iframe) type = 'iframe';
			
			if (type == 'iframe') _showIframe();
			else if (type == 'html') _showContent();
			else if (type == 'inline') _showInline();
			else if (type == 'image') _loadImage();
			else if (type == 'ajax') _loadAjax();
		},
		_loadImage = function() {
			$.foxidialog.showLoading();
			preload_image = new Image();
			preload_image.onload = _showImage;
			preload_image.onerror = _loadError;
			preload_image.src = current_element.source;
		},
		_loadAjax = function() {
			$.foxidialog.showLoading();
			var url = current_options.href || current_element.source;
			ajax = $.ajax($.extend({}, {
				url: url,
				success: _showContent,
				error: _loadError
			}, current_options.ajax));
		},
		_abortAjax = function() {
			$loading.hide();
			preload_image.onload = preload_image.onerror = null;
			if (ajax) {
				ajax.abort();
				ajax = null;
			}
		},
		_loadError = function() {
			var text = arguments[2] || '"' + current_element.source + '" not found.',
				content = 'Load Error! ' + text;
			
			current_options.onError.call(current_element.pointer);
			_showContent(content);
		},
		_showImage = function() {
			$.foxidialog.hideLoading();
			is_image = true;
			$element = $('<img/>').attr({src: preload_image.src, alt: current_element.title}).css({width: preload_image.width, height: preload_image.height, 'vertical-align': 'middle'});
			_showContainer();
		},
		_showIframe = function() {
			$element = $('<iframe/>').attr({src: current_element.source, name: 'foxidialog-iframe', frameborder: 0}).css({width: current_options.width, height: current_options.height, 'vertical-align': 'middle'});
			_showContainer();
		},
		_showInline = function() {
			var element = current_options.href || current_element.source;
			$element = $(element).after($inline = $('<div/>')).show();
			_showContainer();
		},
		_showContent = function() {
			$.foxidialog.hideLoading();
			var content = arguments[0] || current_options.content;
			$element = $('<div/>').html(content);
			_showContainer();
		},
		_showContainer = function() {
			_adjustSize();
			var title = current_element.title || '&nbsp;';
			$title.html(title);
			$wrap.empty().append($element);
			if (current_options.buttons.length) {
				_addButtons();
			}
			var view = _getViewport(),
				container_width = $container.outerWidth(),
				container_height = $container.outerHeight(),
				container_top = max((view.height - container_height) / 2 + view.top, 0),
				container_left = max((view.width - container_width) / 2 + view.left, 0);
			
			$overlay.css({opacity: current_options.overlayOpacity, background: current_options.overlayColor}).fadeIn(current_options.speed);
			$container.css({top: container_top, left: container_left}).fadeIn(current_options.speed, function() {
				is_open = true;
				current_options.onComplete.call(current_element.pointer);
			});
		},
		_addButtons = function() {
			$buttons = $('<div/>').attr('class', 'buttons').insertAfter($wrap);
			var buttons = current_options.buttons,
				clickMe = function(event) {
					$(this).data('callback').call($element, event);
				};
			
			for (var i in buttons) {
				$('<button/>').attr({type: 'button'}).data('callback', buttons[i].click).html(buttons[i].text).click(clickMe).appendTo($buttons);
			}
		},
		_adjustSize = function() {
			$element.appendTo($temp);
			var view = _getViewport(),
				element_width = $temp.width(),
				element_height = $temp.height(),
				max_width = view.width - container_size.width - current_options.margin * 2,
				max_height = view.height - container_size.height - current_options.margin * 2,
				options_max_width = current_options.maxWidth,
				options_max_height = current_options.maxHeight,
				is_percent, ratio;
			
			if (current_element.is_iframe || ! current_options.autoSize) {
				element_width = current_options.width;
				element_height = current_options.height;
			}
			if (options_max_width) {
				is_percent = options_max_width.toString(10).match(percent_regexp);
				max_width = is_percent ? max_width / 100 * min(is_percent[1], 100) : min(options_max_width, max_width);
			}
			if (options_max_height) {
				is_percent = options_max_height.toString(10).match(percent_regexp);
				max_height = is_percent ? max_height / 100 * min(is_percent[1], 100) : min(options_max_height, max_height);
			}
			if (element_height > max_height) {
				if (is_image) {
					ratio = element_width / element_height;
					element_height = max_height;
					element_width = element_height * ratio;
				} else {
					element_height = max_height;
				}
			}
			if (element_width > max_width) {
				if (is_image) {
					ratio = element_height / element_width;
					element_width = max_width;
					element_height = element_width * ratio;
				} else {
					element_width = max_width;
				}
			}
			$element.css({width: element_width, height: element_height});
		};
		
	$.fn.foxidialog = function(options) {
		var options = $.extend({}, defaults, options);
		
		return this.each(function() {
			var me = $(this),
				source = options.href || me.attr('href'),
				title = options.title || me.attr('title') || '',
				is_iframe = me.hasClass('iframe'),
				element = {pointer: me, source: source, title: title, is_iframe: is_iframe},
				__setCurrent = function(event) {
					event.preventDefault();
					current_options = options;
					current_element = element;
					_start();
				};
			
			if ( ! source || javascript_regexp.test(source) || source == '#') return;
			me.removeAttr('title').unbind(namespace).bind('click' + namespace, __setCurrent);
		});
	};
	
	$.foxidialog = function(options) {
		if ( ! options) return;
		var is_iframe = options.type == 'iframe' ? true : false;
		current_options = $.extend({}, defaults, options);
		current_element = {pointer: document, source: current_options.href, title: current_options.title, is_iframe: is_iframe};
		_start();
	};
	
	$.foxidialog.defaults = function(options) {
		$.extend(defaults, options);
	};
	
	$.foxidialog.showLoading = function() {
		$loading.show();
	};
			
	$.foxidialog.hideLoading = function() {
		$loading.hide();
	};
			
	$.foxidialog.cancel = function() {
		if (!current_element) {
			$.foxidialog.hideLoading();
			return;
		}
		current_options.onCancel.call(current_element.pointer);
		_abortAjax();
	};
	
	$.foxidialog.close = function() {
		_abortAjax();
		
		$overlay.fadeOut(current_options.speed);
		$container.fadeOut(current_options.speed, function() {
			is_open = false;
			if ($inline) {
				$inline.after($element.hide()).remove();
				$inline = null;
			}
			if ($buttons) {
				$buttons.remove();
				$buttons = null;
			}
			$container.css({top: 0, left: 0});
			current_options.onClosed.call(current_element.pointer);
		});
	};
	
	_init();
	
	$window.unbind(namespace).bind('keydown' + namespace, _keyAction);
	
})(jQuery);