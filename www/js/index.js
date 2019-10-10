var CameraLib = {
    loadModels : (self) => {
        window.tf_type = new TensorFlow('custom-model-type', {
            'label': 'My Custom Model',
            'label_path': "https://dl.dropboxusercontent.com/s/mhfwklzzivqk8sg/type_files.zip#labels.txt",
            'model_path': "https://dl.dropboxusercontent.com/s/mhfwklzzivqk8sg/type_files.zip#type.pb",
            'input_size': 299,
            'image_mean': 128,
            'image_std': 128,
            'input_name': 'Mul',
            'output_name': 'final_result'
        });

        window.tf_flat = new TensorFlow('custom-model-flat', {
            'label': 'My Custom Model',
            'label_path': "https://dl.dropboxusercontent.com/s/fj6p2u6tvcgmcoa/flat_files.zip#labels.txt",
            'model_path': "https://dl.dropboxusercontent.com/s/fj6p2u6tvcgmcoa/flat_files.zip#flat.pb",
            'input_size': 299,
            'image_mean': 128,
            'image_std': 128,
            'input_name': 'Mul',
            'output_name': 'final_result'
        });

        window.tf_long = new TensorFlow('custom-model-long', {
            'label': 'My Custom Model',
            'label_path': "https://dl.dropboxusercontent.com/s/old9ppled0bahy8/long_files.zip#labels.txt",
            'model_path': "https://dl.dropboxusercontent.com/s/old9ppled0bahy8/long_files.zip#long.pb",
            'input_size': 299,
            'image_mean': 128,
            'image_std': 128,
            'input_name': 'Mul',
            'output_name': 'final_result'
        });

        window.tf_flat.onprogress = function(evt) {
            if (evt['status'] == 'downloading'){
                $("#message").html("Downloading model files...");
                $("#message").html(evt.label);
                if (evt.detail) {
                    var carregados = evt.detail.loaded/1024/1024;
                    var total = evt.detail.total/1024/1024;
                    carregados = carregados.toFixed(2);
                    total = total.toFixed(2);
                    var perc = (carregados * 100 / total).toFixed(2);
                    $("#message").html(`${perc}% ${carregados}MB de ${total}MB (2/3)`);
                }
            } else if (evt['status'] == 'unzipping (2/3)') {
                $("#message").html("Extracting contents... (2/3)");
            } else if (evt['status'] == 'initializing (2/3)') {
                $("#message").html("Initializing TensorFlow (2/3)");
            }
        };

        window.tf_long.onprogress = function(evt) {
            if (evt['status'] == 'downloading'){
                $("#message").html("Downloading model files...");
                $("#message").html(evt.label);
            if (evt.detail) {
                var carregados = evt.detail.loaded/1024/1024;
                var total = evt.detail.total/1024/1024;
                carregados = carregados.toFixed(2);
                total = total.toFixed(2);
                var perc = (carregados * 100 / total).toFixed(2);
                $("#message").html(`${perc}% ${carregados}MB de ${total}MB (3/3)`);
            }
            } else if (evt['status'] == 'unzipping (3/3)') {
                $("#message").html("Extracting contents... (3/3)");
            } else if (evt['status'] == 'initializing (3/3)') {
                $("#message").html("Initializing TensorFlow (3/3)");
            }
        };

        window.tf_type.onprogress = function(evt) {
            if (evt['status'] == 'downloading'){
                $("#message").html("Downloading model files...");
                $("#message").html(evt.label);
            if (evt.detail) {
                var carregados = evt.detail.loaded/1024/1024;
                var total = evt.detail.total/1024/1024;
                carregados = carregados.toFixed(2);
                total = total.toFixed(2);
                var perc = (carregados * 100 / total).toFixed(2);
                $("#message").html(`${perc}% ${carregados}MB de ${total}MB (1/3)`);
            }
            } else if (evt['status'] == 'unzipping (1/3)') {
                $("#message").html("Extracting contents... (1/3)");
            } else if (evt['status'] == 'initializing (1/3)') {
                $("#message").html("Initializing TensorFlow (1/3)");
            }
        };

        window.tf_type.load().then(() => {
            console.log("type loaded");
            window.tf_flat.load().then(() => {
                console.log("flat loaded");
                window.tf_long.load().then(() => {
                    console.log("long loaded");
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
        var optionsTake = {
            width:640,
            height:480,
            quality: 100
        };
        CameraPreview.takePicture(optionsTake, (base64PictureData) => {
            try {
                self.CameraLib.makePrediction(self, base64PictureData);
            } catch (err) {
                console.log(e);
                $("#message").html(e);
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
                $("#message").html("");
                console.log("-- PRED -- ")
                results.forEach((result) => {
                    console.log(result.title + ": " + result.confidence)
                    $("#message").append("flat: " + result.title + ": " + result.confidence+" <br/>");
                });
            }

            // Get predictions
            window.tf_type.classify(base64PictureData).then((typeResults) => {
                var maxConfidenceType = 0;
                var maxTitleType;
                typeResults.forEach((typeResult) => {
                    if (typeResult.confidence > maxConfidenceType){
                        maxTitleType = typeResult.title;
                        maxConfidenceType = typeResult.confidence;
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