/*jshint nomen: false,expr: true, newcap: false, browser: true*/
(function (w) {
    "use strict";

    // GLOBALS UTILS
    var NOW            = Date.now || function () { return new Date().getTime(); },
        RAF            = w.requestAnimationFrame,
        CAF            = w.cancelAnimationFrame,
    // NAMESPACES
        SCROLLER       = w.__S || {},
        PLUGINS        = SCROLLER.plugins,
        HELPERS        = SCROLLER.helpers,
        SUPPORT        = SCROLLER.support,
        STYLES         = SCROLLER.styles,
        CubicBezier    = SCROLLER.CubicBezier,
    // Distinguish type of touch events so they don't conflict in certain contexts, 
    // like Dual gestures on Windows Tablets or in ChromeDevTools 
    // (bug where enabling touch gestures, it fire both types)
        EVENT_TYPE = {
            touchstart : 1,
            touchmove  : 1,
            touchend   : 1,

            mousedown : 2,
            mousemove : 2,
            mouseup   : 2,

            MSPointerDown : 3,
            MSPointerMove : 3,
            MSPointerUp   : 3
        },

        SCROLL_VERTICAL      = 'vertical',
        SCROLL_HORIZONTAL    = 'horizontal',

        // Functions easings for either animations or RAF
        EASING_REGULAR = CubicBezier(0.33, 0.66, 0.66, 1),
        EASING_BOUNCE  = CubicBezier(0.33, 0.33, 0.66, 0.81),
        EASING = {
            regular : {
                style : EASING_REGULAR.toString(),
                fn    : EASING_REGULAR
            },
            bounce : {
                style : EASING_BOUNCE.toString(),
                fn    : EASING_BOUNCE,
            }
        },
        // Default options
        DEFAULTS = {
            enabled              : true,
            bounceTime           : 600,
            useCSSTransition     : true,
            dualListeners        : false,
            bindToWrapper        : false,
            scroll               : SCROLL_VERTICAL,
            gpuOptimization      : true
        },

        ACCELERATION_CONSTANT = 0.0005;

    function Scroller (el, config) {
        config || (config = {});
        this.x    = 0;
        this.y    = 0;

        this._setConfig(config);
        this._setElement(el);
        this._setSize();
        this._initialize();

        this._handleEvents('bind');
    }

    Scroller.prototype = {
        _initialize: function () {},
        _mergeConfigOptions: function (cfg, toMerge) {
            return HELPERS.simpleMerge(cfg, toMerge);
        },
        _setConfig: function (cfg) {
            var opts = this.opts = this._mergeConfigOptions(DEFAULTS, cfg);
            // Config vars
            this.enabled               = opts.enabled;
            this.scroll                = opts.scroll;
            this.acceleration          = ACCELERATION_CONSTANT;
            this.scrollVertical        = this.scroll === SCROLL_VERTICAL;
        },
        _setElement: function (el) {
            this.wrapper       = typeof el == 'string' ? w.document.querySelector(el) : el;
            this.scroller      = this.wrapper.children[0];
            this.scrollerStyle = this.scroller.style;

            this.scroller.classList.add('scroller');
            this.scroller.classList.add( this.scrollVertical ? 'scroll-vertical' : 'scroll-horizontal');
        },
        _setWrapperSize: function () {
            this.wrapperWidth  = this.wrapper.clientWidth;
            this.wrapperHeight = this.wrapper.clientHeight;
            this.wrapperSize   = this.scrollVertical ? this.wrapperHeight : this.wrapperWidth;
        },
        _setSize: function () {
            this._setWrapperSize();

            this.scrollerWidth  = this.scroller.offsetWidth;
            this.scrollerHeight = this.opts.pullToLoadMore ? this.scroller.offsetHeight - ptl_offset : this.scroller.offsetHeight;

            this.maxScrollX     = this.wrapperWidth  - this.scrollerWidth;
            this.maxScrollY     = this.wrapperHeight - this.scrollerHeight;

            this.hasScrollX     = this.maxScrollX < 0;
            this.hasScrollY     = this.maxScrollY < 0;

        },
        _destroy: function () {
            this._handleEvents('unbind');
        },
    /* 
    * ==================================================
    * Event handling and bindings
    * ================================================== 
    */
        _handleEvents: function (action) {
            var eventType = action === 'bind' ? HELPERS.bind : HELPERS.unbind,
                wrapper   = this.wrapper,
                target    = this.opts.bindToWrapper ? wrapper : window,
                pHandlers = false,
                scroller  = this.scroller;

            if (SUPPORT.touch && !this.opts.disableTouch && !pHandlers) {
                eventType(wrapper, 'touchstart',  this);
                eventType(target,  'touchmove',   this);
                eventType(target,  'touchcancel', this);
                eventType(target,  'touchend',    this);
            } 

            if (SUPPORT.pointers && !this.opts.disablePointers) {
                eventType(wrapper, 'MSPointerDown',   this);
                eventType(target,  'MSPointerMove',   this);
                eventType(target,  'MSPointerCancel', this);
                eventType(target,  'MSPointerUp',     this);
                pHandlers = true;
            }

            if (!this.opts.disableMouse && (!pHandlers || (pHandlers && this.opts.dualListeners))) {
                eventType(wrapper, 'mousedown',   this);
                eventType(target,  'mousemove',   this);
                eventType(target,  'mousecancel', this);
                eventType(target,  'mouseup',     this);
            }


            eventType(this.scroller, 'transitionend', this);
            eventType(this.scroller, SUPPORT.prefix + 'TransitionEnd', this);
            
        },
        handleEvent: function (e) {
            switch ( e.type ) {
                case 'touchstart':
                case 'MSPointerDown':
                case 'mousedown':
                    this._start(e);
                    break;
                case 'touchmove':
                case 'MSPointerMove':
                case 'mousemove':
                    this._move(e);
                    break;
                case 'touchend':
                case 'MSPointerUp':
                case 'mouseup':
                case 'touchcancel':
                case 'MSPointerCancel':
                case 'mousecancel':
                    this._end(e);
                    break;
                case 'transitionend':
                case SUPPORT.prefix + 'TransitionEnd':
                    this._transitionEnd(e);
                    break;
            }
        },
    /* 
    * ==================================================
    * Scroller gestures
    * ================================================== 
    */
        _start: function (e) {
            if ( !this.enabled || (this._initiated && EVENT_TYPE[e.type] !== this._initiated)) {
                return;
            }

            var point = e.touches ? e.touches[0] : e,
                pos;

            this._initiated  = EVENT_TYPE[e.type]; // for onMove mouse check and other contexts
            this.moved       = false;  // for onMove threshold check
            this.distY       = 0;

            this._transitionTime();   // removes time on transition (reset CSS timing)
            this._isAnimating = false; // reset animation

            if (this._isScrolling) {
                this._stopMomentum();
                this._isScrolling = false;
            }
            this.startY    = this.y;
            this.pointY    = point.pageY;
            this.startTime = NOW();

        },
        _move: function (e) {
            if ( !this.enabled || (EVENT_TYPE[e.type] !== this._initiated) ) {
                return;
            }

            var point     = e.touches ? e.touches[0] : e,
                deltaY    = point.pageY - this.pointY,
                timestamp = NOW(),
                newY,
                absDistY;

            if (!this.moved) {
                this.moved = true;
            }
            //get the delta
            this.pointY   = point.pageY;
            this.distY    += deltaY;
            newY = this.y + deltaY;

            // move the scroller
            this._translate(0, newY);

            // This is to reduce variability and to keep track only on the recent past of the gesture
            if ( timestamp - this.startTime > 300 ) {
                this.startTime = timestamp;
                this.startY = this.y;
            }
        },
        _end: function (e) {
            if ( !this.enabled || EVENT_TYPE[e.type] !== this._initiated ) {
                return;
            }
            //reset move
            this._initiated = false;

            //No movement
            if (!this.moved) {
                //TODO: Tap/Click
                return;
            }

            var duration = NOW() - this.startTime,
                time     = 0,
                bounce   = EASING.regular,
                momentum;

            this._translate(0, this.y);
            this._isScrolling = true;

            //calculate the destination, speed based of gesture
            if (this.scrollVertical) {
                momentum = this._momentum(this.y, this.startY, duration, this.maxScrollY, this.wrapperHeight);
                this._scrollTo(0, momentum.destination, momentum.time, momentum.bounce);
            } else {
                //todo
            }
        },
    /* 
    * ==================================================
    * Scroller Maths and calculation
    * ================================================== 
    */
        _getVelocity: function (current, start, time) {
            var distance = current - start,
                velocity = distance / time;
            return velocity;
        },
        _computeMomentum: function (velocity, current) {
            var acceleration = this.acceleration * (velocity < 0 ?  1 : -1),
                distance     = -(velocity * velocity) / (2 * acceleration),
                time         = -velocity / acceleration;
            return {
                destination : distance + current,
                time        : time
            };
        },
        _momentum: function (current, start, duration, lowerMargin, wrapperSize) {
            var velocity = this._getVelocity(current, start, duration),
                momentum = this._computeMomentum(velocity, current);
            return momentum;

        },
        _stopMomentum: function () {
            var transform = STYLES.transform,
                style, matrix, x, y;

            if (this.opts.useCSSTransition) {
                if (SUPPORT.matrix) {
                    style  = w.getComputedStyle(this.scroller, null);
                    matrix = new STYLES.matrix(style[transform]);
                    this.scrollerStyle[transform] = '';
                    x = matrix.m41; 
                    y = matrix.m42;
                } else {
                    matrix = matrix[transform].split(')')[0].split(', ');
                    x = +(matrix[12] || matrix[4]);
                    y = +(matrix[13] || matrix[5]);
                } 
                this._translate(x, y);
            } else {
                //TODO
            }
        },

        _scrollTo: function (x, y, time, easing) {
            easing || (easing = EASING.regular);

            if (!time || this.opts.useCSSTransition) {
                this._transitionEasing(easing.style);
                this._transitionTime(time);
                this._translate(x, y);
            } else {
                //TODO
            }
        },
        
        _transitionEasing: function (easing) {
            this.scrollerStyle[STYLES.transitionTimingFunction] = easing;
        },
        _transitionTime: function (time) {
                time || (time = 0);
                this.scrollerStyle[STYLES.transitionDuration] = time + 'ms';
        },
        _translate: function (x, y) {
            this.scrollerStyle[STYLES.transform] = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,' + x +',' + y +', 0, 1)';
            this.x = x;
            this.y = y;
        },
        _transitionEnd: function (e) {
            if (this.opts.useCSSTransition && e.target === this.scroller) {
                this._transitionTime();
            }
        },
        destroy: function () {
            this._destroy();
        }
    };

    w.Scroller = SCROLLER.constructor = Scroller;

}(window));