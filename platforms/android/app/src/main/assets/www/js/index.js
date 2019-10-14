var LamnLib = {
    debug : true,

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
            self.LamnLib.updateDetails(evt, 1);
        };
        window.tf_flat.onprogress = (evt) => {
            self.LamnLib.updateDetails(evt, 2);
        };
        window.tf_long.onprogress = (evt) => {
            self.LamnLib.updateDetails(evt, 3);
        };

        // Load all the models
        window.tf_type.load().then(() => {
            window.tf_flat.load().then(() => {
                window.tf_long.load().then(() => {
                    // Models loaded, remove splash
                    console.log("All models loaded!");
                    self.LamnLib.loadedModels(self);

                    // Start predictions
                    self.LamnLib.capturePhoto(self);
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
        self.LamnLib.loadModels(self);
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
                self.LamnLib.makePrediction(self, base64PictureData);
            } catch (err) {
                alert(e);
            }
        });
    },


    getSobel64 : (self, img) => {
        // Create a canvas,
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        // Set it to the image, to get the picture as an ImageData
        context.drawImage(img, 0, 0);
        var imageData = context.getImageData(0, 0, img.width, img.height);

        // Convert this
        var sobelImageData = Sobel(imageData).toImageData();
        context.putImageData(sobelImageData, 0, 0);
        var sobelBase64 = canvas.toDataURL('image/jpeg').split(",")[1];

        // Add a camera preview
        if (self.LamnLib.debug) {
            var previewWidth = 150;
            canvas.style.cssText = `position:absolute;
                                    left: ${window.screen.width - (previewWidth + 10) }px;
                                    top: 10px;
                                    width: ${previewWidth}px;
                                    height: ${previewWidth}px;
                                    border: 2px solid white;
                                    border-radius: 10px;`;
            document.body.appendChild(canvas);
        }
        return sobelBase64;
    },

    makePrediction : (self, base64PictureData) => {
        // Set the context to the base image
        var img = new Image();
        imageSrcData = 'data:image/jpeg;base64,' + base64PictureData;
        img.onload = (event) => {
            // Get sobel data
            var sobelBase64 = self.LamnLib.getSobel64(self, img);

            window.tf_type.classify(sobelBase64).then((typeResults) => {
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
                        .then((results) => {self.LamnLib.parseResults(self, results)});
                }
                else if (maxTitleType == "long") {
                    window.tf_long.classify(base64PictureData)
                        .then((results) => {self.LamnLib.parseResults(self, results)});
                }
            });

            // Continue the camera capture loop
            self.LamnLib.capturePhoto(self);
        }
        img.src = imageSrcData;
    }
}



var app = {
    LamnLib : LamnLib,

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    onDeviceReady: function() {
        LamnLib.startCamera(this);
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