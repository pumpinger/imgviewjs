

;(function (factory) {
    if ( typeof define === 'function' && define['amd']) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
})(function($){
    var global,dialog,view,view_ctrl,ctrl_right,ctrl_left,ctrl_close,detail;
    var ctrl_magnify,ctrl_shrink,ctrl_rotate,ctrl_recover;   //放大缩小旋转回复 按钮

    var loading;   //等待图片
    var imgDom;   //imgDom
    var showWidth,showHeight;   //图像在view 中显示的宽高
    var imgs=[];   //要显示的图像们
    var infoDom;  //要显示的信息
    var imageObj = new Image(); //用来加载图片的对象
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
        var offset=view.height()-imgDom.height();
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
        showHeight=imgDom.height();
        showWidth=imgDom.width();
    }

    function dragImg(e){
        var offsetY = startY -e.pageY;
        var offsetX = startX -e.pageX;

        imgDom.css('margin-top',-offsetY);
        imgDom.css('margin-left',-offsetX);
    }

    function bindEVent(){
        //图片读取
        imageObj.onload = function(){
            imgDom.show();
            loading.hide();
            imgDom.prop('src',imageObj.src);
            imgDom.css({
                'margin-top':calcuImgTop()
            });
            maxWeight=(imageObj.width/imgDom.width())*1.5;
            calcuImgWH();
        };

        //隐藏imgview
        global.click(function (e){
            if(isNotMove){
                if(this=== e.target){
                    $(this).hide();
                    imageObj.src="";

                }
            }
        });
        ctrl_close.click(function (e){
            if(isNotMove){
                if(this=== e.target){
                    global.hide();
                    imageObj.src="";

                }
            }
        });

        //拖拽
        imgDom.bind('mousedown',function (e){
            e.preventDefault();
            startX=e.pageX-parseInt(imgDom.css('margin-left'));
            startY=e.pageY-parseInt(imgDom.css('margin-top'));
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
        imgDom.click(function (e){
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


        imgDom.bind('mousewheel', function(event) {
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
            fnRotateScale(imgDom[0],rotate+=90);
        });


    }

    function handlerImgScale(){
        imgDom.css('width',showWidth*weight);
        imgDom.css('height',showHeight*weight);
        imgDom.css('max-width','none');
        imgDom.css('max-height','none');
        imgDom.css('margin-top',calcuImgTop());
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
            'position':'relative',
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
            'box-sizing':'border-box',
            'overflow':'hidden',
            'height':'100%',
            'user-select':'none',
            'text-align':'center',
            'position':'relative',
            'line-height':'100%'
        });



        imgDom=$('<img>').appendTo(view);
        imgDom.css({
            'transition':'transform 0.5s',
            'cursor':'pointer'
        });

        view_ctrl=$('<div>').appendTo(view);
        view_ctrl.css({
            'position':'absolute',
            'bottom':'5px',
            'background':'#000',
            'width':'98%'
        });


        ctrl_recover=$('<span>').appendTo(view_ctrl);
        ctrl_recover.css({
            'display':'inline-block',
            'width':'22px',
            'height':'19px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("./images/square.png") no-repeat'
        });

        ctrl_magnify=$('<span>').appendTo(view_ctrl);
        ctrl_magnify.css({
            'display':'inline-block',
            'width':'22px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("./images/enlarge.png") no-repeat'
        });

        ctrl_shrink=$('<span>').appendTo(view_ctrl);
        ctrl_shrink.css({
            'display':'inline-block',
            'width':'21px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("./images/narrow.png") no-repeat'
        });

        ctrl_rotate=$('<span>').appendTo(view_ctrl);
        ctrl_rotate.css({
            'display':'inline-block',
            'width':'20px',
            'height':'20px',
            'margin':'10px',
            'cursor':'pointer',
            'background':'url("./images/Refresh_1.png") no-repeat'
        });


        ctrl_left=$('<span>').appendTo(view);
        ctrl_left.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'25px',
            'height':'43px',
            'left':'1%',
            'top':'48%',
            'cursor':'pointer',
            'background':'url("./images/Left.png") no-repeat'
        });

        ctrl_right=$('<span>').appendTo(view);
        ctrl_right.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'25px',
            'height':'43px',
            'cursor':'pointer',
            'right':'1%',
            'top':'48%',
            'background':'url("./images/right.png") no-repeat'
        });

        ctrl_close=$('<span>').appendTo(dialog);
        ctrl_close.css({
            'display':'inline-block',
            'position':'absolute',
            'width':'28px',
            'height':'29px',
            'cursor':'pointer',
            'right':'-14px',
            'top':'0',
            'background':'url("./images/close_1.png") no-repeat'
        });

        loading=$('<img>').appendTo(view);
        loading.css({
            'position':'absolute',
            'top':'48%',
            'left':'50%',
            'margin-left':'-30px',
            'display':'none'
        });
        loading.prop('src','./images/load.gif');


    }
    function handerImgRecover(){
        //重新调整到初始位置
        imgDom.css({
            'max-height':'100%',
            'max-width':'100%',
            'margin-left':'0',
            'width':'initial',
            'height':'initial'
        });
        //改变宽高之后才能算出正确的 margin-top
        imgDom.css({
            'margin-top':calcuImgTop()
        });
        weight=1;
        fnRotateScale(imgDom[0],rotate=0);
    }
    var _is_init = false;
    function init(){
        if(!_is_init){
            buildHtml();
            bindEVent();
            _is_init = true;
        }
    }



    //应该是load img   load完了应该才是 showimg
    function showImg(index){
        if(!imgs[index]){
            return false;
        }

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
        imgDom.hide();
        onSwitch(index);
        imageObj.src = imgs[index];
        return true;

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



    //自己定义显示哪些图片
    $.extend({
        imgView: function(option) {
            init();
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
            showImg(index=0);
        }
    });

    //自动定义
    $('body').on('click','.imgView .imgView_item',function (){
        init();
        imgs = [];
        $.each($(this).parent().children(),function (i){
            imgs[i]=$(this).attr('imgViewSrc');
        });
        showImg(index=$(this).index());
    });


});
