/** @namespace x3dom.nodeTypes */
/*
 * X3DOM JavaScript Library
 * http://www.x3dom.org
 *
 * (C)2009 Fraunhofer IGD, Darmstadt, Germany
 * Dual licensed under the MIT and GPL
 */

/* ### GeoLocation ### */
x3dom.registerNodeType(
    "GeoLocation",
    "Geospatial",
    //was X3DGroupingNode which is how the node is defined in the spec
    defineClass(x3dom.nodeTypes.X3DTransformNode,
        
        /**
         * Constructor for GeoLocation
         * @constructs x3dom.nodeTypes.GeoLocation
         * @x3d 3.3
         * @component Geospatial
         * @status experimental
         * @extends x3dom.nodeTypes.X3DTransformNode
         * @param {Object} [ctx=null] - context object, containing initial settings like namespace
         * @classdesc The GeoLocation node provides the ability to geo-reference any standard X3D model.
         * That is, to take an ordinary X3D model, contained within the children of the node, and to specify its geospatial location.
         * This node is a grouping node that can be thought of as a Transform node.
         * However, the GeoLocation node specifies an absolute location, not a relative one, so content developers should not nest GeoLocation nodes within each other.
         */
        function (ctx) {
            x3dom.nodeTypes.GeoLocation.superClass.call(this, ctx);


            /**
             * The geoSystem field is used to define the spatial reference frame.
             * @var {x3dom.fields.MFString} geoSystem
             * @range {["GD", ...], ["UTM", ...], ["GC", ...]}
             * @memberof x3dom.nodeTypes.GeoLocation
             * @initvalue ['GD','WE']
             * @field x3d
             * @instance
             */
            this.addField_MFString(ctx, 'geoSystem', ['GD', 'WE']);

            /**
             * The geometry of the nodes in children is to be specified in units of metres in X3D coordinates relative to the location specified by the geoCoords field.
             * The geoCoords field can be used to dynamically update the geospatial location of the model.
             * @var {x3dom.fields.SFVec3d} geoCoords
             * @memberof x3dom.nodeTypes.GeoLocation
             * @initvalue 0,0,0
             * @field x3d
             * @instance
             */
            this.addField_SFVec3d(ctx, 'geoCoords', 0, 0, 0);

            /**
             * The geoOrigin field is used to specify a local coordinate frame for extended precision.
             * @var {x3dom.fields.SFNode} geoOrigin
             * @memberof x3dom.nodeTypes.GeoLocation
             * @initvalue x3dom.nodeTypes.X3DChildNode
             * @field x3d
             * @instance
             */
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.X3DChildNode);

            // similar to what transform in Grouping.js does
            var position = this._vf.geoCoords;
            var geoSystem = this._vf.geoSystem;
            var geoOrigin = this._cf.geoOrigin;

            this._trafo =  this.getGeoTransRotMat(geoSystem, geoOrigin, position);
        
        },
        {
            getGeoRotMat: function (positionGC)
            {
                //returns transformation matrix to align coordinate system with geoposition as required:
                //2 rotations to get required orientation
                //Up (Y) to skywards, and depth (-Z) to North
                //1) around X to point up by
                //angle between Z and new up plus 90
                //(angle between Z and orig. up)
                //2) around Z to get orig. up on longitude

                var newUp = positionGC.normalize();
                var Xaxis = new  x3dom.fields.SFVec3f(1,0,0);
                // below uses geocentric latitude but only geodetic latitude would give exact tangential plane
                // http://info.ogp.org.uk/geodesy/guides/docs/G7-2.pdf
                // has formulas for deriving geodetic latitude, eg a GCtoGD function

                var rotlat = Math.PI - Math.asin(newUp.z); // latitude as asin of z; only valid for spheres
                var rotUpQuat = new x3dom.fields.Quaternion.axisAngle(Xaxis, rotlat);
                var rotlon = Math.PI/2 + Math.atan2(newUp.y, newUp.x);// 90 to get to prime meridian; atan2 gets the sign correct for longitude; is exact since in circular section
                var Zaxis = new x3dom.fields.SFVec3f(0,0,1);
                var rotZQuat = new x3dom.fields.Quaternion.axisAngle(Zaxis, rotlon);
                //return rotZQuat.toMatrix().mult(rotUpQuat.toMatrix();
                return rotZQuat.multiply(rotUpQuat).toMatrix();

            },
            getGeoTransRotMat: function (geoSystem, geoOrigin, position)
            {
                //accept geocoords, returntranslation/rotation transform matrix
                var coords = new x3dom.fields.MFVec3f();
                coords.push(position);

                var transformed = x3dom.nodeTypes.GeoCoordinate.prototype.GEOtoX3D(geoSystem, geoOrigin, coords)[0];
                var rotMat = this.getGeoRotMat(transformed);
                return x3dom.fields.SFMatrix4f.translation(transformed).mult(rotMat);

            },
            //mimic what transform node does
            fieldChanged: function (fieldName)
            {
                if (fieldName == "geoSystem" || fieldName == "geoCoords" ||
                    fieldName == "geoOrigin")
                {
                    var position = this._vf.geoCoords;
                    var geoSystem = this._vf.geoSystem;
                    var geoOrigin = this._cf.geoOrigin;
                    this._trafo =  this.getGeoTransRotMat(geoSystem, geoOrigin, position);

                    this.invalidateVolume();
                    //this.invalidateCache();
                }
                else if (fieldName == "render") {
                    this.invalidateVolume();
                    //this.invalidateCache();
                }
            }
            //deal with geolocation in geolocation here? behaviour is undefined in spec

        }
    )
);