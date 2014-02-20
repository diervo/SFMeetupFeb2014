(function (w) {
	if (!w.__S) {
		w.__S = {plugins: {}};
	}
	//TODO: REMOVE DEBUGGING
    w.DEBUG = (function (d) {
		return d ? console : {
			warn: function () {
				w.console.warn.apply(console, arguments);
			}, 
			log: function () {/* noop */}
		};
    }(document.location.hash === '#debug'));

}(window));
(function (w) {
    //FOREACH Polyfill
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(fun /*, thisArg */) {
            "use strict";
            if (this === void 0 || this === null) throw new TypeError();
            var t = Object(this), len = t.length >>> 0;
            if (typeof fun !== "function") throw new TypeError();

            var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
            for (var i = 0; i < len; i++) {
                if (i in t) fun.call(thisArg, t[i], i, t);
            }
        };
    }

    var SCROLLER = w.__S || (w.__S = {}),
        DOCUMENT_STYLE = w.document.documentElement.style,
        VENDORS  = ['webkit', 'Moz', 'ms'],

        supportTransition = false,
        supportTransform  = false,
        property, prefix, i;

    // TRANSITION SUPPORT
    if ('transition' in DOCUMENT_STYLE) {
        supportTransition = true;
        prefix = '';
    } else {
        for (i = 0; i < VENDORS.length; i++) {
            property = VENDORS[i] + 'Transition';
            if (DOCUMENT_STYLE.transform !== 'undefined') {
                supportTransition = true;
                prefix = VENDORS[i];
            }
        }
    }
    // TRANSFORM SUPPORT
    if (typeof DOCUMENT_STYLE.transform !== 'undefined') {
        supportTransform = true;
    } else {
        for (i = 0; i < VENDORS.length; i++) {
            property = VENDORS[i] + 'Transform';
            if (typeof DOCUMENT_STYLE[property] !== 'undefined') {
                supportTransform = true;
                prefix = VENDORS[i];
            }
        }
    }

    SCROLLER.support = {
        prefix     : prefix,
        transition : supportTransition,
        transform  : supportTransform,
        matrix     : !!(w.WebKitCSSMatrix || w.MSCSSMatrix),
        touch      : 'ontouchstart' in w,
        pointers   : w.navigator.msPointerEnabled
    };

}(window));
(function (w) {
    var SCROLLER = w.__S || (w.__S = {}),
		SUPPORT  = SCROLLER.support,
		prefix   = SUPPORT && SUPPORT.prefix,
		props = {};

    function getTotalWidthOrHeight(name, el) {
        var cssExpand   = ['Top', 'Right', 'Bottom', 'Left'],
            elStyles    = w.getComputedStyle(el),
            isWidth     = name === 'width',
            attrCount   = isWidth ? 1 : 0,
            val         = 0;

        for (; attrCount < 4; attrCount += 2) {
            val += parseInt(elStyles['margin' + cssExpand[attrCount]], 10);
        }

        return val + (isWidth ? el.offsetWidth : el.offsetHeight);
    }

    if (!SUPPORT) {
		w.console.log('Scroller Dependency error! browser support detection needed');
		return;
    }

    if (SUPPORT.transition && SUPPORT.transform) {
        if (prefix !== '') {
            props = {
                transform                : prefix + 'Transform',
                transitionTimingFunction : prefix + 'TransitionTimingFunction',
                transitionDuration       : prefix + 'TransitionDuration',
                transformOrigin          : prefix + 'TransformOrigin',
                boxSizing                : prefix + 'BoxSizing',
                matrix                   : SUPPORT.matrix ? (w.WebKitCSSMatrix || w.MSCSSMatrix) : null
            };

        } else {
            props = {
                transform                : 'transform',
                transitionTimingFunction : 'transitionTimingFunction',
                transitionDuration       : 'transitionDuration',
                transformOrigin          : 'transformOrigin',
                boxSizing                : 'boxSizing',
                matrix: null
            };    
        }
    }

    props.getHeight = function (el) {
        return getTotalWidthOrHeight('height', el);
    };
    props.getWidth = function (el) {
        return getTotalWidthOrHeight('width', el);
    };

    SCROLLER.styles = props;

}(window));
(function (w) {
	"use strict";

	// Namespace
	var SCROLLER = w.__S || (w.__S = {}),
        HELPERS = {
            simpleMerge: function (obj1, obj2) {
                var obj3 = {}, attrname;
                for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
                for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
                return obj3;
            },
            parseDOM: function (data) {
                var div;
                if (!data) return;
                
                if (typeof data === "string") {
                    div = w.document.createElement('div');
                    div.innerHTML = data;
                    return Array.prototype.slice.call(div.children, 0);
                } else if (data.length) {
                    // TODO: Double check this
                    return Array.prototype.slice.call(data, 0);
                } else {
                    return [data];
                }
            },
            bind: function (el, type, fn, capture) {
                el.addEventListener(type, fn, !!capture);
            },
            unbind: function (el, type, fn, capture) {
                el.removeEventListener(type, fn, !!capture);
            }
        };

    SCROLLER.helpers = HELPERS;

}(window));
(function(w) {
    
  var lastTime = 0,
      vendors  = ['ms', 'moz', 'webkit', 'o'];

    for(var x = 0; x < vendors.length && !w.requestAnimationFrame; ++x) {
        w.requestAnimationFrame = w[vendors[x] + 'RequestAnimationFrame'];
        w.cancelAnimationFrame  = w[vendors[x] + 'CancelAnimationFrame'] || w[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!w.requestAnimationFrame) {
        w.requestAnimationFrame = function(callback, element) {
            var currTime   = new Date().getTime(),
                timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                id         = w.setTimeout(function() {callback(currTime + timeToCall);}, timeToCall);

            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!w.cancelAnimationFrame) {
        w.cancelAnimationFrame = function(id) {
            w.clearTimeout(id);
        };
    }

}(window));
//POLYFILL CLASSLIST (https://github.com/remy/polyfills/blob/master/classList.js)

(function (w) {
  if (typeof w.Element === "undefined" || "classList" in document.documentElement) return;

  // adds indexOf to Array prototype for IE support
  if (!Array.prototype.indexOf) {
      Array.prototype.indexOf = function(obj, start) {
          for (var i = (start || 0), j = this.length; i < j; i++) {
              if (this[i] === obj) { return i; }
          }
          return -1;
      };
  }

  var prototype = Array.prototype,
      indexOf = prototype.indexOf,
      slice = prototype.slice,
      push = prototype.push,
      splice = prototype.splice,
      join = prototype.join;

  function DOMTokenList(el) {  
    this._element = el;
    if (el.className != this._classCache) {
      this._classCache = el.className;

      if (!this._classCache) return;
      
        // The className needs to be trimmed and split on whitespace
        // to retrieve a list of classes.
        var classes = this._classCache.replace(/^\s+|\s+$/g,'').split(/\s+/),
          i;
      for (i = 0; i < classes.length; i++) {
        push.call(this, classes[i]);
      }
    }
  }

  function setToClassName(el, classes) {
    el.className = classes.join(' ');
  }

  DOMTokenList.prototype = {
    add: function(token) {
      if(this.contains(token)) return;
      push.call(this, token);
      setToClassName(this._element, slice.call(this, 0));
    },
    contains: function(token) {
      return indexOf.call(this, token) !== -1;
    },
    item: function(index) {
      return this[index] || null;
    },
    remove: function(token) {
      var i = indexOf.call(this, token);
       if (i === -1) {
         return;
       }
      splice.call(this, i, 1);
      setToClassName(this._element, slice.call(this, 0));
    },
    toString: function() {
      return join.call(this, ' ');
    },
    toggle: function(token) {
      if (!this.contains(token)) {
        this.add(token);
      } else {
        this.remove(token);
      }

      return this.contains(token);
    }
  };

  window.DOMTokenList = DOMTokenList;

  function defineElementGetter (obj, prop, getter) {
          if (Object.defineProperty) {
                  Object.defineProperty(obj, prop,{
                          get : getter
                  });
          } else {                                        
                  obj.__defineGetter__(prop, getter);
          }
  }

  defineElementGetter(Element.prototype, 'classList', function () {
    return new DOMTokenList(this);                        
  });

}(window));
(function (w) {
	"use strict";

	// Namespace
	var SCROLLER = w.__S || (w.__S = {}),
		ITERATIONS = 4;

	// Bezier curve calculation
    function KeySpline (mX1, mY1, mX2, mY2) {
		var CubicBezierSpline;

        // Bezier functions
        function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
        function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
        function C(aA1)      { return 3.0 * aA1; }
         
        // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
        function CalcBezier(aT, aA1, aA2) {
            return ( (A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
        }
         
        // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
        function GetSlope(aT, aA1, aA2) {
            return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
        }
         
        function GetTForX(aX) {
        // Newton raphson iteration
            var aGuessT = aX,
                iterations = ITERATIONS,
                currentSlope, currentX, i;

            for (i = 0; i < iterations; i++) {
                currentSlope = GetSlope(aGuessT, mX1, mX2);
                if (currentSlope === 0.0) {
                    return aGuessT;
                }

                currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
                aGuessT -= currentX / currentSlope;
            }

            return aGuessT;
        }

        CubicBezierSpline = function(aX) {
            if (mX1 == mY1 && mX2 == mY2) {
                return aX; // linear
            }

            return CalcBezier(GetTForX(aX), mY1, mY2);
        };

        CubicBezierSpline.toString = function () {
			return 'cubic-bezier('+ mX1 +', ' + mY1 + ', ' + mX2 + ', ' + mY2 + ')';
        };

        return CubicBezierSpline;
    }

    SCROLLER.CubicBezier = KeySpline;

}(window));