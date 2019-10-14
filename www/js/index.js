var CameraLib = {
    /** Inputs & outputs **/

    /*
     * All the models are loaded, predictions start
     */
    loadedModels : (self) => {
        // Remove overlay
        var overlay = document.getElementById("loading-overlay");
        while (overlay.firstChild) {
            overlay.removeChild(overlay.firstChild);
        }
        $("#loading-overlay").removeClass("overlay");
    },

    /*
     * Ordered set of results
     */
    parseResults : (self, results) => {
        $("#prediction-table").html("");
        results.forEach((result, index) => {
            var html = `<tr class="${(index == 0) ? 'main' : 'sub'}-prediction">
                <td class="col-left">${result.title}</td>
                <td class="col-right">:  ${(100*result.confidence).toFixed(2)}%</td>
            </tr>`;
            $("#prediction-table").append(html);
        });
    },

    /*
     * Model downloading, unzipping and initialisation setup events
     */
    updateDetails : (evt, modelNum) => {
        if (evt['status'] == 'downloading'){
            $("#status-loading").html("Preparing...");
            if (evt.detail) {
                var perc = (evt.detail.loaded * 100 / evt.detail.total).toFixed(2);
                $("#status-loading").html(`(${modelNum}/3): Downloading ${perc}%`);
            }
        } else if (evt['status'] == "unzipping") {
            $("#status-loading").html("(" + modelNum + "/3): Extracting");
        } else if (evt['status'] == "initializing") {
            $("#status-loading").html("(" + modelNum + "/3): Initializing TF");
        }
    },


    /** Backend functionality **/
    loadModels : (self) => {
        function getOptions(labelpath, modelpath) {
            return {
                'label': 'My Custom Model',
                'label_path': labelpath,
                'model_path': modelpath,
                'input_size': 299,
                'image_mean': 128,
                'image_std': 128,
                'input_name': 'Mul',
                'output_name': 'final_result'
            }
        }

        var labelpath = "https://dl.dropboxusercontent.com/s/mhfwklzzivqk8sg/type_files.zip#labels.txt"
        var modelpath = "https://dl.dropboxusercontent.com/s/mhfwklzzivqk8sg/type_files.zip#type.pb";
        window.tf_type = new TensorFlow('custom-model-type', getOptions(labelpath, modelpath));

        var labelpath = "https://dl.dropboxusercontent.com/s/fj6p2u6tvcgmcoa/flat_files.zip#labels.txt";
        var modelpath = "https://dl.dropboxusercontent.com/s/fj6p2u6tvcgmcoa/flat_files.zip#flat.pb";
        window.tf_flat = new TensorFlow('custom-model-flat', getOptions(labelpath, modelpath));

        var labelpath = "https://dl.dropboxusercontent.com/s/old9ppled0bahy8/long_files.zip#labels.txt";
        var modelpath = "https://dl.dropboxusercontent.com/s/old9ppled0bahy8/long_files.zip#long.pb";
        window.tf_long = new TensorFlow('custom-model-long', getOptions(labelpath, modelpath));

        // Set setup progress events
        window.tf_type.onprogress = (evt) => {
            self.CameraLib.updateDetails(evt, 1);
        };
        window.tf_flat.onprogress = (evt) => {
            self.CameraLib.updateDetails(evt, 2);
        };
        window.tf_long.onprogress = (evt) => {
            self.CameraLib.updateDetails(evt, 3);
        };

        // Load all the models
        window.tf_type.load().then(() => {
            window.tf_flat.load().then(() => {
                window.tf_long.load().then(() => {
                    // Models loaded, remove splash
                    console.log("All models loaded!");
                    self.CameraLib.loadedModels(self);

                    // Start predictions
                    self.CameraLib.capturePhoto(self);
                });
            });
        });
    },

    // Start the camera
    startCamera : (self) => {
        CameraPreview.startCamera({
            x: 0,
            y: 0,
            width: window.screen.width,
            height: window.screen.height,
            camera: CameraPreview.CAMERA_DIRECTION.BACK,
            toBack: true,
            tapPhoto: true,
            tapFocus: false,
            previewDrag: false
        });

        // Star the camera capturing loop
        self.CameraLib.loadModels(self);
    },

    // Take a photo, and make a prediction
    capturePhoto: (self) => {
        console.log("Photo captured!")
        var pictureOptions = {
            width:640,
            height:480,
            quality: 100
        };
        CameraPreview.takePicture(pictureOptions, (base64PictureData) => {
            try {
                self.CameraLib.makePrediction(self, base64PictureData);
            } catch (err) {
                alert(e);
            }
        });
    },

    classifyImage: (self, base64PictureData) => {
        return;
    },

    makePrediction : (self, base64PictureData) => {
        // Set the context to the base image
        var img = new Image();
        imageSrcData = 'data:image/jpeg;base64,' + base64PictureData;
        img.onload = (event) => {

            // Create a canvas, either on the page or simply in code
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Get the sobel data
            var imageData = canvas.toDataURL('image/jpeg');//ctx.getImageData(0, 0, img.width, img.height);
            //ctx.putImageData(imageData, 0, 0);
            //ctx.putImageData(Sobel(imageData).toImageData(), 0, 0);
            //sobelBase64 = canvas.toDataURL('image/jpeg');
            //console.log(sobelBase64);
            CameraPreview.stopCamera();

            var im1 = new Image();
            im1.onload = () => {
                document.body.appendChild(im1);
            }
            im1.src = imageData;

            /*
            var im2 = new Image();
            im2.onload = () => {
                document.body.appendChild(im2);
            }
            im2.src = sobelBase64;
            */

            /*
            var ima = document.getElementById('my-img');
            ima.onload = drawImage;
            $('#my-img').attr('src', imageSrcData);
            */
        }
        img.src = imageSrcData;



        function drawImage(event) {
            console.log(event.type);
            // Get predictions
            window.tf_type.classify(base64PictureData).then((typeResults) => {
                // Get the Magplug type
                var maxConfidenceType;
                var maxTitleType;
                typeResults.forEach((typeResult) => {
                    if (typeResult.confidence >= 0.5){
                        maxTitleType = typeResult.title;
                    }
                });

                // Based off the type, perform second stage predictions
                if (maxTitleType == "flat"){
                    window.tf_flat.classify(base64PictureData)
                        .then((results) => {self.CameraLib.parseResults(self, results)});
                }
                else if (maxTitleType == "long") {
                    window.tf_long.classify(base64PictureData)
                        .then((results) => {self.CameraLib.parseResults(self, results)});
                }
            });



            // Continue the camera capture loop
            self.CameraLib.capturePhoto(self);
        }
    }
}






var app = {
    CameraLib : CameraLib,

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    onDeviceReady: function() {
        CameraLib.startCamera(this);
	},

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        /*
		var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');
		listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');
		console.log('Received Event: ' + id);
		*/
    }
};
app.initialize();