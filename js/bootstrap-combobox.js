/* =============================================================
 * bootstrap-combobox.js v1.2.0
 * =============================================================
 * Copyright 2019 Daniel Farrell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */
/*
* This file has been extensively from the original.
* 
* Changes are to improve bootstrap 4 compatibility, improve accessibility,
* and functional changes to the way this javascript works
* 
* 
* 
* =========================================================+++ */

(function ($) {

    "use strict";

    /* COMBOBOX PUBLIC CLASS DEFINITION
     * ================================ */

    var hasPopper = false; //typeof Popper !== 'undefined';

    var Combobox = function (element, options) {
        this.options = $.extend({}, $.fn.combobox.defaults, options);
        if (!hasPopper) {
            hasPopper = this.options.userBootStrapBundle;
        }
        this.template = this.options.template || this.template;
        this.$source = $(element);
        this.columns = this.options.columns || -1;
        this.$container = this.setup();
        this.$element = this.$container.find('input[type=text]');
        this.$target = this.$container.find('input[type=hidden]');
        this.$button = this.$container.find('.dropdown-toggle');
        this.$menu = this.$container.find('.dropdown-menu');
        this.$menu.hide();
        this.matcher = this.options.matcher || this.matcher;
        this.sorter = this.options.sorter || this.sorter;
        this.highlighter = this.options.highlighter || this.highlighter;
        this.shown = false;
        this.selected = false;
        this.renderLimit = this.options.renderLimit || -1;
        this.clearIfNoMatch = this.options.clearIfNoMatch;
        this.refresh();
        this.transferAttributes();
        this.listen();
        if (this.$element.prop('autofocus')) {
            this.$element.focus();
        }
    };

    Combobox.prototype = {

        constructor: Combobox

        , setup: function () {

            var combobox;

            var inputGroup = this.$source.parent('.input-group');
            if (inputGroup.length > 0) {
                combobox = $(this.template());
                inputGroup.after(this.$source);
                inputGroup.after(combobox);
                var groupAppendItems = inputGroup.find(".input-group-append>.input-group-text");
                var newgroupAppend = combobox.find(".input-group-append");
                if (groupAppendItems) {
                    newgroupAppend.append(groupAppendItems);
                }
                inputGroup.remove();
            }
            else {

                combobox = $(this.template());
                this.$source.before(combobox);
            }
            this.$source.hide();
            this.$source.prop('hidden', true);
            this.$source.attr('aria-hidden', 'true');
            this.$source.removeAttr('aria-required');
            if (this.$source.hasClass('form-control-sm')) {
                combobox.find('.input-group').addClass('input-group-sm');
            }
            if (this.$source.hasClass('form-control-lg')) {
                combobox.find('.input-group').addClass('input-group-lg');
            }
            var inputElement = combobox.find('input[type=text]');
            var elementId = this.$source.attr("id");
            if (elementId) {
                inputElement.attr('id', elementId + '_combobox');
                var label = $('label[for="' + elementId + '"]');
                if (label) {
                    label.attr('for', elementId + '_combobox');
                }
            }
            return combobox;
        }

        , disable: function () {
            this.$element.prop('disabled', true);
            this.$button.attr('disabled', true);
            this.disabled = true;
            this.$container.addClass('combobox-disabled');
        }

        , enable: function () {
            this.$element.prop('disabled', false);
            this.$button.attr('disabled', false);
            this.disabled = false;
            this.$container.removeClass('combobox-disabled');
        }
        , parse: function () {
            var that = this
                , map = {}
                , source = []
                , selected = false
                , selectedValue = '';
            this.$source.find('option').each(function () {
                var option = $(this);
                //if (option.val() === '') {
                //    that.options.placeholder = option.text();
                //    return;
                //}
                map[option.text()] = option.val();
                source.push(option.text());
                if (option.prop('selected')) {
                    selected = option.text();
                    selectedValue = option.val();
                }
            })
            this.map = map;
            if (selected) {
                this.$element.val(selected);
                this.$target.val(selectedValue);
                this.$container.addClass('combobox-selected');
                this.selected = true;
            }
            return source;
        }

        , transferAttributes: function () {
            this.options.placeholder = this.$source.attr('data-placeholder') || this.options.placeholder;
            if (this.options.appendId !== undefined) {
                this.$element.attr('id', this.$source.attr('id') + this.options.appendId);
            }
            this.$element.attr('placeholder', this.options.placeholder);
            this.$target.prop('name', this.$source.prop('name'));
            this.$target.val(this.$source.val());
            this.$source.removeAttr('name')  // Remove from source otherwise form will pass parameter twice.
            this.$element.attr('required', this.$source.attr('required'));
            this.$element.prop('autofocus', this.$source.prop('autofocus'));
            this.$source.removeAttr('autofocus');
            this.$element.attr('aria-required', this.$source.attr('aria-required'));
            this.$element.attr('data-rule-required', this.$source.attr('data-rule-required'));
            this.$element.attr('data-msg-required', this.$source.attr('data-msg-required'));
            this.$element.attr('rel', this.$source.attr('rel'));
            this.$element.attr('title', this.$source.attr('title'));
            this.$element.attr('class', this.$source.attr('class'));
            this.$element.attr('tabindex', this.$source.attr('tabindex'));
            this.columns = this.$source.attr('data-columns') || this.columns;
            if (this.columns > 0) {
                this.$element.attr('size', this.columns);
            }
            this.$source.removeAttr('tabindex');
            if (this.$source.attr('disabled') !== undefined)
                this.disable();
        }

        , select: function () {
            var val = this.$menu.find('.active').attr('data-value');
            this.$element.val(this.updater(val)).trigger('change');
            this.$target.val(this.map[val]).trigger('change');
            this.$source.val(this.map[val]).trigger('change');
            this.$container.addClass('combobox-selected');
            this.selected = true;
            return this.hide();
        }

        , updater: function (item) {
            return item;
        }

        , show: function () {
            var pos = $.extend({}, this.$element.position(), {
                height: this.$element[0].offsetHeight
            });

            this.$menu
                .insertAfter(this.$element)
                .css({
                    top: pos.top + pos.height
                    , left: pos.left
                });
            this.$menu.show();

            $('.dropdown-menu').on('mousedown', $.proxy(this.scrollSafety, this));

            this.shown = true;
            return this;
        }

        , hide: function () {
            this.$menu.hide();
            $('.dropdown-menu').off('mousedown', $.proxy(this.scrollSafety, this));
            this.$element.on('blur', $.proxy(this.blur, this));
            this.shown = false;
            return this;
        }

        , lookup: function (event) {
            this.query = this.$element.val();
            return this.process(this.source);
        }

        , process: function (items) {
            var that = this;

            items = $.grep(items, function (item) {
                return that.matcher(item);
            })

            items = this.sorter(items);

            if (!items.length) {
                return this.shown ? this.hide() : this;
            }

            return this.render(items.slice(0, this.options.items)).show();
        }

        , template: function () {
            if (this.options.bsVersion == '2') {
                return '<div class="combobox-container"><input type="hidden" /> <div class="input-append"> <input type="text" autocomplete="off" /> <span class="add-on dropdown-toggle" data-dropdown="dropdown"> <span class="caret pulldown" style="vertical-align: middle"/> <i class="icon-remove remove"/> </span> </div> </div>'
            } else if (this.options.bsVersion == '3') {
                return '<div class="combobox-container"> <input type="hidden" /> <div class="input-group"> <input type="text" autocomplete="off" /> <span class="input-group-addon dropdown-toggle" data-dropdown="dropdown"> <span class="caret pulldown" /> <span class="glyphicon glyphicon-remove remove" /> </span> </div> </div>'
            } else {
                return '<div class="combobox-container"> <input type="hidden" /> <div class="input-group"> <input type="text" autocomplete="off" />'
                    + '<span class="input-group-append" >'
                    + '<span class="input-group-text dropdown-toggle"' + (this.options.iconCaret ? ' custom-icon' : '') + (hasPopper ? ' data-toggle="dropdown" data-reference="parent"' : '') + '>'
                    + (this.options.iconCaret ? '<span class="' + this.options.iconCaret + ' pulldown" />' : '')
                    + (this.options.iconRemove ? '<span class="' + this.options.iconRemove + ' remove" />' : '<span class="utf-remove remove" />')
                    + '</span>' + this.options.menu +
                    + '</span> </div> </div>';
            }
        }

        , matcher: function (item) {
            return ~item.toLowerCase().indexOf(this.query.toLowerCase());
        }

        , sorter: function (items) {
            var beginswith = []
                , caseSensitive = []
                , caseInsensitive = []
                , item;
            var emptyItem = false;
            while ((item = items.shift()) !== undefined) {

                if (item !== "") {
                    if (!item.toLowerCase().indexOf(this.query.toLowerCase())) { beginswith.push(item); }
                    else if (~item.indexOf(this.query)) { caseSensitive.push(item); }
                    else { caseInsensitive.push(item); }
                }
                else {
                    emptyItem = true;
                }
            }
            if (emptyItem) {
                beginswith.unshift("");
            }

            return beginswith.concat(caseSensitive, caseInsensitive);
        }

        , highlighter: function (item) {
            var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
            return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
                return '<strong>' + match + '</strong>';
            })
        }

        , render: function (items) {
            var that = this;

            items = $(items).map(function (i, item) {
                if (~that.renderLimit && i >= that.renderLimit)
                    return;
                i = $(that.options.item).attr('data-value', item);
                if (i.is('a')) {
                    i.html(that.highlighter(item));
                }
                else {
                    i.find('a').html(that.highlighter(item));
                }
                return i[0];
            });

            items.first().addClass('active');
            this.$menu.html(items);
            return this;
        }

        , next: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , next = active.next();

            if (!next.length) {
                next = $(this.$menu.find('a')[0]);
            }

            next.addClass('active');
        }

        , prev: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , prev = active.prev();

            if (!prev.length) {
                prev = this.$menu.find('a').last();
            }

            prev.addClass('active');
        }

        , toggle: function () {
            if (!this.disabled) {
                if (this.$container.hasClass('combobox-selected')) {
                    this.clearTarget();
                    this.triggerChange();
                    this.clearElement();
                } else {
                    if (this.shown) {
                        this.hide();
                    } else {
                        this.clearElement();
                        this.lookup();
                    }
                }
            }
        }
        , toggleShowAll: function () {
            if (!this.disabled) {
                this.query = '';
                this.$element.focus();
                this.process(this.source);
            }
        }

        , scrollSafety: function (e) {
            if (e.target.tagName === 'div') {
                this.$element.off('blur');
            }
        }
        , clearElement: function () {
            this.$element.val('').focus();
        }

        , clearTarget: function () {
            this.$source.val('');
            this.$target.val('');
            this.$container.removeClass('combobox-selected');
            this.selected = false;
        }

        , triggerChange: function () {
            this.$source.trigger('change');
        }

        , refresh: function () {
            this.source = this.parse();
            this.options.items = this.source.length;
        }

        , listen: function () {
            this.$element
                .on('focus', $.proxy(this.focus, this))
                .on('blur', $.proxy(this.blur, this))
                .on('keypress', $.proxy(this.keypress, this))
                .on('keyup', $.proxy(this.keyup, this));

            if (this.eventSupported('keydown')) {
                this.$element.on('keydown', $.proxy(this.keydown, this));
            }

            this.$menu
                .on('click', $.proxy(this.click, this))
                .on('mouseenter', 'a', $.proxy(this.mouseenter, this))
                .on('mouseleave', 'a', $.proxy(this.mouseleave, this));

            this.$button
                .on('click', $.proxy(this.toggleShowAll, this));
        }

        , eventSupported: function (eventName) {
            var isSupported = eventName in this.$element;
            if (!isSupported) {
                this.$element.setAttribute(eventName, 'return;');
                isSupported = typeof this.$element[eventName] === 'function';
            }
            return isSupported;
        }

        , move: function (e) {
            if (!this.shown) { return; }

            switch (e.keyCode) {
                case 9: // tab
                case 13: // enter
                case 27: // escape
                    e.preventDefault();
                    break;

                case 38: // up arrow
                    e.preventDefault();
                    this.prev();
                    this.fixMenuScroll();
                    break;

                case 40: // down arrow
                    e.preventDefault();
                    this.next();
                    this.fixMenuScroll();
                    break;
            }

            e.stopPropagation();
        }

        , fixMenuScroll: function () {
            var active = this.$menu.find('.active');
            if (active.length) {
                var top = active.position().top;
                var bottom = top + active.height();
                var scrollTop = this.$menu.scrollTop();
                var menuHeight = this.$menu.height();
                if (bottom > menuHeight) {
                    this.$menu.scrollTop(scrollTop + bottom - menuHeight);
                } else if (top < 0) {
                    this.$menu.scrollTop(scrollTop + top);
                }
            }
        }

        , keydown: function (e) {
            this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40, 38, 9, 13, 27]);
            this.move(e);
        }

        , keypress: function (e) {
            if (this.suppressKeyPressRepeat) { return; }
            this.move(e);
        }

        , keyup: function (e) {
            switch (e.keyCode) {
                case 40: // down arrow
                    if (!this.shown) {
                        this.toggle();
                    }
                    break;
                case 39: // right arrow
                case 38: // up arrow
                case 37: // left arrow
                case 36: // home
                case 35: // end
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                    break;

                case 9: // tab
                case 13: // enter
                    if (!this.shown) { return; }
                    this.select();
                    break;

                case 27: // escape
                    if (!this.shown) { return; }
                    this.hide();
                    break;

                default:
                    this.clearTarget();
                    this.lookup();
            }

            e.stopPropagation();
            e.preventDefault();
        }

        , focus: function (e) {
            this.focused = true;
        }

        , blur: function (e) {
            var that = this;
            this.focused = false;
            var val = this.$element.val();
            if (!this.selected && val !== '') {
                if (that.clearIfNoMatch)
                    this.$element.val('');
                this.$source.val('').trigger('change');
                this.$target.val('').trigger('change');
            }
            if (!this.mousedover && this.shown) { setTimeout(function () { that.hide(); }, 200); }
        }

        , click: function (e) {
            e.stopPropagation();
            e.preventDefault();
            this.select();
            this.$element.focus();
        }

        , mouseenter: function (e) {
            this.mousedover = true;
            this.$menu.find('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        }

        , mouseleave: function (e) {
            this.mousedover = false;
        }
        , setValue: function (value) {
            var val = this.$source.find("option[value='" + value + "']").text();
            if (val) {
                this.query = val;
                this.process(this.source);
                this.select();
            }
        }
        , setText: function (text) {
            this.query = text;
            this.process(this.source);
            this.select();
        }

    };

    /* COMBOBOX PLUGIN DEFINITION
     * =========================== */
    $.fn.combobox = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('combobox')
                , options = typeof option === 'object' && option;
            if (!data) { $this.data('combobox', (data = new Combobox(this, options))); }
            else {
                if (typeof option.refresh !== "undefined") {
                    data.refresh();
                }
                if (typeof option.setValue !== "undefined") {
                    data.setValue(option.setValue);
                }
                if (typeof option.setText !== "undefined") {
                    data.setText(option.setText);
                }
            }
            
            if (typeof option === 'string') { data[option](); }
        });
    };

    $.fn.combobox.defaults = {
        bsVersion: '4'
        , menu: '<div class="typeahead typeahead-long dropdown-menu"></div>'
        , item: '<a href="#" class="dropdown-item"></a>'
        , iconCaret: undefined
        , iconRemove: undefined
        , clearIfNoMatch: true
        , userBootStrapBundle: false
    };

    $.fn.combobox.Constructor = Combobox;

}(window.jQuery));