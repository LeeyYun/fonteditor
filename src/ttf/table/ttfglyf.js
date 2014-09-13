/**
 * @file ttfglyf.js
 * @author mengke01
 * @date 
 * @description
 * 
 * ttf的glyf轮廓，用来解析单个路径
 * 
 * https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6glyf.html
 */


define(
    function(require) {
        var glyFlag = require('../enum/glyFlag');
        var table = require('./table');

        function readSimpleGlyf(reader, ttf, offset, val) {

            reader.seek(offset);

            // 轮廓个数
            var contours = val.endPtsOfContours[
                    val.endPtsOfContours.length - 1
                ] + 1;

            // 获取flag标志
            var i = 0;
            while (i < contours) {
                var flag = reader.readUint8();
                val.flags.push(flag);
                i++;

                // 标志位3重复flag 
                if (flag & glyFlag.REPEAT && i < contours) {
                    // 重复个数
                    var repeat = reader.readUint8();
                    for ( var j = 0; j < repeat; j++) {
                        val.flags.push(flag);
                        i++;
                    }
                }
            }

            // xCoordinates
            val.xCoorinateOffset = reader.offset;
            var prevX = 0;
            for (var i = 0, l = val.flags.length; i < l; ++i) {
                var x = 0;
                var flag = val.flags[i];

                //标志位1
                // If set, the corresponding y-coordinate is 1 byte long, not 2
                if (flag & glyFlag.XSHORT) {
                    x = reader.readUint8();

                    //标志位5
                    // This flag has two meanings, depending on how the x-Short Vector flag is set. If x-Short Vector is set, this
                    // bit describes the sign of the value, with 1 equalling
                    // positive and 0 negative. If the x-Short Vector bit is
                    // not set and this bit is set, then the current x-coordinate is the same as the previous x-coordinate.
                    // If the x-Short Vector bit is not set and this bit is also
                    // not set, the current x-coordinate is a signed 16-bit
                    // delta vector
                    x = (flag & glyFlag.XSAME) ? x : -1 * x;
                }
                // 与上一值一致
                else if (flag & glyFlag.XSAME) {
                    x = 0;
                } 
                // 新值
                else {
                    x = reader.readInt16();
                }

                prevX += x;
                val.xCoordinates[i] = prevX;
                val.coordinates[i] = {
                    x : prevX,
                    y : 0
                };
                if (flag & glyFlag.ONCURVE) {
                    val.coordinates[i].onCurve = true;
                }
            }

            // yCoordinates
            val.yCoorinateOffset = reader.offset;
            var prevY = 0;
            for ( var i = 0, l = val.flags.length; i < l; i++) {
                var y = 0;
                var flag = val.flags[i];

                if (flag & glyFlag.YSHORT) {
                    y = reader.readUint8();
                    y = (flag & glyFlag.YSAME) ? y : -1 * y;
                } 

                else if (flag & glyFlag.YSAME) {
                    y = 0;
                } 

                else {
                    y = reader.readInt16();
                }

                prevY += y;
                val.yCoordinates[i] = prevY;
                if (val.coordinates[i]) {
                    val.coordinates[i].y = prevY;
                }
            }
        }

        var ttfglyf = table.create(
            'ttfglyf', 
            [], 
            {
                /**
                 * 解析ttfglyfl表
                 */
                read: function(reader, ttf) {
                    var offset = this.offset;
                    var val = ttfglyf.empty();

                    reader.seek(offset);

                    // 边界值
                    val.numberOfContours = reader.readInt16();
                    val.xMin = reader.readInt16();
                    val.yMin = reader.readInt16();
                    val.xMax = reader.readInt16();
                    val.yMax = reader.readInt16();

                    // endPtsOfConturs
                    var endPtsOfContours = [];
                    if (val.numberOfContours >= 0) {
                        for ( var i = 0; i < val.numberOfContours; i++) {
                            endPtsOfContours.push(reader.readUint16());
                        }
                        val.endPtsOfContours = endPtsOfContours;
                    }

                    // instructions
                    var length = reader.readUint16();
                    var instructions = [];
                    for ( var i = 0; i < length; ++i) {
                        instructions.push(reader.readUint8());
                    }

                    val.instructions = instructions;

                    // 读取简单字形
                    if (val.numberOfContours >= 0) {
                        readSimpleGlyf.call(
                            this,
                            reader,
                            ttf,
                            reader.offset,
                            val
                        );
                    }
                    else {
                        // 读取复杂字形
                        //throw 'not support Compound  glyf';
                        console.error('not support Compound  glyf', val);
                    }

                    return val;
                }
            }
        );

        // 空路径
        ttfglyf.empty = function() {
            var val = {};
            val.flags = [];
            val.endPtsOfContours = [];
            val.contours = 0;
            val.coordinates = [];
            val.xCoorinateOffset = 0; // x偏移
            val.xCoordinates = []; //x 坐标集合
            val.yCoorinateOffset = 0; // y偏移
            val.yCoordinates = []; // y坐标集合
            return val;
        };

        return ttfglyf;
    }
);
