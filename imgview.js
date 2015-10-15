/**
 * Created by fu.
 * Date: 2015/4/16
 * Time: 16:16
 */

(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
                    ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.12',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
            // Clean up the data we added to the element
            $.removeData(this, 'mousewheel-line-height');
            $.removeData(this, 'mousewheel-page-height');
        },

        getLineHeight: function(elem) {
            var $elem = $(elem),
                $parent = $elem['offsetParent' in $.fn ? 'offsetParent' : 'parent']();
            if (!$parent.length) {
                $parent = $('body');
            }
            return parseInt($parent.css('fontSize'), 10) || parseInt($elem.css('fontSize'), 10) || 16;
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true, // see shouldAdjustOldDeltas() below
            normalizeOffset: true  // calls getBoundingClientRect for each event
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0,
            offsetX    = 0,
            offsetY    = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Normalise offsetX and offsetY properties
        if ( special.settings.normalizeOffset && this.getBoundingClientRect ) {
            var boundingRect = this.getBoundingClientRect();
            offsetX = event.clientX - boundingRect.left;
            offsetY = event.clientY - boundingRect.top;
        }

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        event.offsetX = offsetX;
        event.offsetY = offsetY;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));


(function($){
    var global,dialog,view,view_ctrl,ctrl_right,ctrl_left,detail,close_view;
    var ctrl_magnify,ctrl_shrink,ctrl_rotate,ctrl_recover;   //放大缩小旋转回复 按钮

    var loading;   //等待图片
    var img;   //imgDom
    var showWidth,showHeight;   //图像在view 中显示的宽高
    var imgs=[];   //要显示的图像们
    var infoDom;  //要显示的信息
    var image = new Image(); //用来加载图片的对象
    var index=1;   //展示第几个图片
    var maxWeight; //图片最大放大系数  //由于图片可能一show 就被缩小了  而我们的放大系数是针对原图大小
    var weight=1;  //图片放大缩小系数
    var rotate=0;  //图片旋转度数
    var isNotMove=true;   //拖拽图片时 不响应点击事件 的开关
    var dragTime;   //拖拽图片时 定时器
    var startX,startY;  //拖拽图片

    var zIndex;  //还未投入使用
    var onSwitch = function(){};  //切换图片的函数


    function calcuImgTop(){
        var offset=view.height()-img.height();
        return offset/2;
    }

    function calcuImgWH(){
//            //计算在view中的  图像的宽高  （可能是原图大小  可能是被max-height max-width 处理过的）
//            if(image.width>view.width()){
//                showWidth=view.width();
//                showHeight=image.height*view.width()/image.width;
//            }else if(image.height>view.height()){
//                showHeight=view.height();
//                showWidth=image.width*view.height()/image.height;
//            }else{
//                showHeight=image.height;
//                showWidth=image.width;
//            }
            showHeight=img.height();
            showWidth=img.width();
    }

    function dragImg(e){
        var offsetY = startY -e.pageY;
        var offsetX = startX -e.pageX;

        img.css('margin-top',-offsetY);
        img.css('margin-left',-offsetX);
    }

    function bindEVent(){
        //图片读取
        image.onload = function(){
            img.show();
            loading.hide();
            img.prop('src',image.src);
            img.css({
                'margin-top':calcuImgTop()
            });
            maxWeight=(image.width/img.width())*1.5;
            calcuImgWH();
        };

        //隐藏imgview
        global.click(function (e){
            if(isNotMove){
                if(this=== e.target){
                    $(this).hide();
                    image.src="";

                }
            }
        });
        close_view.click(function (e){
            if(isNotMove){
                if(this=== e.target){
                    global.hide();
                    image.src="";

                }
            }
        });

        //拖拽
        img.bind('mousedown',function (e){
            e.preventDefault();
            startX=e.pageX-parseInt(img.css('margin-left'));
            startY=e.pageY-parseInt(img.css('margin-top'));
            $(document).bind('mousemove',function (e){
                e.preventDefault();
                $('body').css('cursor','move');
                isNotMove=false;
                dragImg(e);
            });
            $(document).bind('mouseup',function (e){
                $(document).unbind('mousemove');
                $('body').css('cursor','initial');
                clearTimeout(dragTime);
                dragTime=setTimeout(function (){
                    isNotMove=true;
                },100);
            });
        });





        //切换
        img.click(function (e){
            if(isNotMove){
                if(!showImg(++index)){
                    index--;
                }
            }
        });


        ctrl_right.click(function (e){
            if(!showImg(++index)){
                index--;
            }
            e.stopPropagation();

        });


        ctrl_left.click(function (e){
            if(!showImg(--index)){
                index++;
            }
            e.stopPropagation();
        });


        img.bind('mousewheel', function(event) {
            event.preventDefault();
            if(event.deltaY===1){
                if(weight<maxWeight){
                    weight+=0.1;
                }
            }else{
                if(weight>0.5){
                    weight-=0.1;
                }
            }

            handlerImgScale();


//                console.log(event.deltaY, event.deltaFactor, event.originalEvent.deltaMode, event.originalEvent.wheelDelta);
        });




        ctrl_recover.click(function (){
            handerImgRecover();
        });

        ctrl_magnify.click(function (){
            if(weight<maxWeight){
                weight+=0.1;
            }
            handlerImgScale();
        });

        ctrl_shrink.click(function (){
            if(weight>0.5){
                weight-=0.1;
            }
            handlerImgScale();
        });

        ctrl_rotate.click(function (){
            fnRotateScale(img[0],rotate+=90);
        });


    }

    function handlerImgScale(){
        img.css('width',showWidth*weight);
        img.css('height',showHeight*weight);
        img.css('max-width','none');
        img.css('max-height','none');
        img.css('margin-top',calcuImgTop());
    }




    function buildHtml(){
        global=$('<div>').appendTo("body");
        global.css({
            'background':'rgba(0,0,0,0.5)',
            'position':'fixed',
            'top':'0',
            'bottom':'0',
            'left':'0',
            'right':'0',
            'z-index':'9999',
            'display':'none'
        });

        dialog=$('<div>').appendTo(global);
        dialog.css({
            'width':'70%',
            'min-width':'500px',
            'margin':'0% auto',
            'padding':'10px 0',
            'height':'100%'
        });


        detail=$('<div>').appendTo(dialog);
        detail.css({
            'width':'30%',
            'background':'#ddd',
            'display':'none',
//                'overflow':'hidden',
            'height':'100%',
            'float':'left',
            'padding':'1%'
        });

        view=$('<div>').appendTo(dialog);
        view.css({
            'background':'#000',
            'width':'100%',
            'padding':'1% 1% 50px 1%',
            'overflow':'hidden',
            'height':'100%',
            'user-select':'none',
            'text-align':'center',
            'position':'relative',
            'line-height':'100%'
        });



        img=$('<img>').appendTo(view);
        img.css({
            'transition':'transform 0.5s'
        });

        view_ctrl=$('<div>').appendTo(view);
        view_ctrl.css({
            'position':'absolute',
            'bottom':'0',
            'background':'#000',
            'width':'98%'
        });


        ctrl_recover=$('<span>').appendTo(view_ctrl);
        ctrl_recover.css({
            'display':'inline-block',
            'width':'22px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-199px -140px'
        });

        ctrl_magnify=$('<span>').appendTo(view_ctrl);
        ctrl_magnify.css({
            'display':'inline-block',
            'width':'22px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-186px -60px'
        });

        ctrl_shrink=$('<span>').appendTo(view_ctrl);
        ctrl_shrink.css({
            'display':'inline-block',
            'width':'22px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-197px -81px'
        });

        ctrl_rotate=$('<span>').appendTo(view_ctrl);
        ctrl_rotate.css({
            'display':'inline-block',
            'width':'20px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-221px -38px'
        });


        ctrl_left=$('<span>').appendTo(view);
        ctrl_left.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'23px',
            'height':'40px',
            'left':'1%',
            'top':'48%',
            'cursor':'pointer',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-115px -2px'
        });

        ctrl_right=$('<span>').appendTo(view);
        ctrl_right.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'23px',
            'height':'40px',
            'cursor':'pointer',
            'right':'1%',
            'top':'48%',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-115px -47px'
        });

        close_view=$('<span>').appendTo(view);
        close_view.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'20px',
            'height':'20px',
            'cursor':'pointer',
            'right':'0',
            'top':'0',
            'background':'url("'+publicUrl+'/img/imgview.png")',
            'background-position':'-235px -96px'
        });

        loading=$('<img>').appendTo(view);
        loading.css({
            'position':'absolute',
            'top':'48%',
            'left':'50%',
            'margin-left':'-30px',
            'display':'none'
        });
        loading.prop('src',publicUrl+'/images/c_load.gif');


    }
    function handerImgRecover(){
        //重新调整到初始位置
        img.css({
            'max-height':'100%',
            'max-width':'100%',
            'margin-left':'0',
            'width':'initial',
            'height':'initial'
        });
        //改变宽高之后才能算出正确的 margin-top
        img.css({
            'margin-top':calcuImgTop()
        });
        weight=1;
        fnRotateScale(img[0],rotate=0);
    }
    var _is_init = false;
    function init(){
        if(!_is_init){
            buildHtml();
            bindEVent();
            _is_init = true;
        }
    }

    //自己定义显示哪些图片
    $.extend({
        imgView: function(option) {
            init();
            dealOption(option);
            showImg(index=0);
        }
    });

    //自动定义
    $('body').delegate('.imgView>li','click',function (){
        init();
        imgs = [];
        $.each($(this).parent().children(),function (i){
            imgs[i]=$(this).attr('imgViewSrc');
        });
        showImg(index=$(this).index());
    });

    //应该是load img   load完了应该才是 showimg
    function showImg(index){
        handerImgRecover();
        //判断左右两个按钮
        if(imgs.length == 0){
            ctrl_right.hide();
            ctrl_left.hide();

        }else if(imgs.length == 1){
            ctrl_right.hide();
            ctrl_left.hide();
        }else if(index==0){
            ctrl_left.hide();
            ctrl_right.show();
        }else if(index==imgs.length-1){
            ctrl_right.hide();
            ctrl_left.show();
        }else{
            ctrl_left.show();
            ctrl_right.show();
        }

        global.show();
        if(imgs.length){
            loading.show();
        }
        img.hide();
        onSwitch(index);
        image.src = imgs[index];
        return true;

    }


    function dealOption(option){
        imgs=option.imgs;
        zIndex=option.zIndex||2000;
        infoDom=option.infoDom;
        if(infoDom){
            detail.show();
            detail.html(infoDom);
            $(infoDom).show();
            view.css('width','70%');
        }
        onSwitch=option.onSwitch||function(){};
    }

    function fnRotateScale(dom, angle, scale) {
        if (dom && dom.nodeType === 1) {
            angle = parseFloat(angle) || 0;
            scale = parseFloat(scale) || 1;
            if (typeof(angle) === "number") {
                //IE
                var rad = angle * (Math.PI / 180);
                var m11 = Math.cos(rad) * scale, m12 = -1 * Math.sin(rad) * scale, m21 = Math.sin(rad) * scale;
                dom.style.filter = "progid:DXImageTransform.Microsoft.Matrix(M11="+ m11 +",M12="+ m12 +",M21="+ m21 +",M22="+ m11 +",SizingMethod='auto expand')";
                //Modern
                dom.style.MozTransform = "rotate("+ angle +"deg) scale("+ scale +")";
                dom.style.WebkitTransform = "rotate("+ angle +"deg) scale("+ scale +")";
                dom.style.OTransform = "rotate("+ angle +"deg) scale("+ scale +")";
                dom.style.Transform = "rotate("+ angle +"deg) scale("+ scale +")";
            }
        }
    }

})(jQuery);
