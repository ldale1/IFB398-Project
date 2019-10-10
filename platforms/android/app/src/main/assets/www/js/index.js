var CameraLib = {
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

        function updateDetails(evt, modelNum) {
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
        }

        window.tf_type.onprogress = (evt) => {
            updateDetails(evt, 1);
        };
        window.tf_flat.onprogress = (evt) => {
            updateDetails(evt, 2);
        };
        window.tf_long.onprogress = (evt) => {
            updateDetails(evt, 3);
        };

        // Load all the models
        window.tf_type.load().then(() => {
            window.tf_flat.load().then(() => {
                window.tf_long.load().then(() => {
                    console.log("All models loaded!");
                    
                   // Remove overlay
                    var overlay = document.getElementById("loading-overlay");
                    while (overlay.firstChild) {
                        overlay.removeChild(overlay.firstChild);
                    }
                    $("#loading-overlay").removeClass("overlay");

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

    makePrediction : (self, base64PictureData) => {
        imageSrcData = 'data:image/jpeg;base64,' + base64PictureData;
        //$("#deviceready").removeClass("blink");
        $('#my-img').attr('src', imageSrcData);
        var canvas = document.getElementById('canvas');
        var canvasSobel = document.getElementById('canvas-sobel');
        var context = canvas.getContext('2d');
        var contextSobel = canvas.getContext('2d');
        var ima = document.getElementById('my-img');
        ima.onload = drawImage;

        function drawImage(event) {
            var width = ima.width;
            var height = ima.height;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(ima, 0, 0);
            var imageData = context.getImageData(0, 0, width, height);

            // Sobel constructor returns an Uint8ClampedArray with sobel data
            var sobelData = Sobel(imageData);

            // [sobelData].toImageData() returns a new ImageData object
            var sobelImageData = sobelData.toImageData();
            contextSobel.putImageData(sobelImageData, 0, 0);
            var newbaseHeader = canvasSobel.toDataURL("image/jpeg");
            var baseArray = newbaseHeader.split(",");
            var newbase = baseArray[1];
            var correctIndex = 0;

            // Show the predictions
            var parseResults = (results) => {
                $("#prediction-table").html("");
                results.forEach((result, index) => {
                    var html = `<tr class="${(index == 0) ? 'main' : 'sub'}-prediction">
                        <td class="col-left">${result.title}</td>
                        <td class="col-right">:  ${(100*result.confidence).toFixed(2)}%</td>
                    </tr>`;
                    $("#prediction-table").append(html);
                });
            }

            // Get predictions
            window.tf_type.classify(base64PictureData).then((typeResults) => {
                var maxConfidenceType;
                var maxTitleType;
                typeResults.forEach((typeResult) => {
                    if (typeResult.confidence >= 0.5){
                        maxTitleType = typeResult.title;
                    }
                });

                // Second stage predictions
                if (maxTitleType == "flat"){
                    window.tf_flat.classify(base64PictureData)
                        .then((results) => {parseResults(results)});
                }
                else if (maxTitleType == "long") {
                    window.tf_long.classify(base64PictureData)
                        .then((results) => {parseResults(results)});
                }
            });
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
        CameraLib.loadModels(this);
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