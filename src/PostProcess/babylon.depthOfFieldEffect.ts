module BABYLON {
    
    //TODO is there something this class should extend?. I dont think this fits as a postprocess or pipeline.
    /**
     * The depth of field effect applies a blur to objects that are closer or further from where the camera is focusing.
     */
    export class DepthOfFieldEffect {
        private readonly DepthOfFieldPassPostProcessId: string = "DepthOfFieldPassPostProcessId";
        private readonly CircleOfConfusionPostProcessId: string = "CircleOfConfusionPostProcessEffect"; 
        private readonly DepthOfFieldBlurXPostProcessId: string = "DepthOfFieldBlurXPostProcessEffect";
        private readonly DepthOfFieldBlurYPostProcessId: string = "DepthOfFieldBlurYPostProcessEffect";
        private readonly DepthOfFieldMergePostProcessId: string = "DepthOfFieldMergePostProcessEffect";

        private depthOfFieldPass: PassPostProcess;
        private circleOfConfusion: CircleOfConfusionPostProcess;
        private depthOfFieldBlurX: DepthOfFieldBlurPostProcess;
        private depthOfFieldBlurY: DepthOfFieldBlurPostProcess;
        private depthOfFieldMerge: DepthOfFieldMergePostProcess;

        /**
         * The size of the kernel to be used for the blur
         */
        public set kernelSize(value: number){
            this.depthOfFieldBlurX.kernel = value;
            this.depthOfFieldBlurY.kernel = value;
        }
        public get kernelSize(){
            return this.depthOfFieldBlurX.kernel;
        }
        /**
         * The focal the length of the camera used in the effect
         */
        public set focalLength(value: number){
            this.circleOfConfusion.focalLength = value;
        }
        public get focalLength(){
            return this.circleOfConfusion.focalLength;
        }
        /**
         * F-Stop of the effect's camera. The diamater of the resulting aperture can be computed by lensSize/fStop. (default: 1.4)
         */
        public set fStop(value: number){
            this.circleOfConfusion.fStop = value;
        }
        public get fStop(){
            return this.circleOfConfusion.fStop;
        }
        /**
         * Distance away from the camera to focus on in scene units/1000 (eg. millimeter). (default: 2000)
         */
        public set focusDistance(value: number){
            this.circleOfConfusion.focusDistance = value;
        }
        public get focusDistance(){
            return this.circleOfConfusion.focusDistance;
        }
        /**
         * Max lens size in scene units/1000 (eg. millimeter). Standard cameras are 50mm. (default: 50) The diamater of the resulting aperture can be computed by lensSize/fStop.
         */
        public set lensSize(value: number){
            this.circleOfConfusion.lensSize = value;
        }
        public get lensSize(){
            return this.circleOfConfusion.lensSize;
        }

        /**
         * Creates a new instance of @see DepthOfFieldEffect
         * @param pipeline The pipeline to add the depth of field effect to.
         * @param scene The scene the effect belongs to.
         * @param camera The camera to apply the depth of field on.
         * @param pipelineTextureType The type of texture to be used when performing the post processing.
         */
        constructor(pipeline: PostProcessRenderPipeline, scene: Scene, camera:Camera, pipelineTextureType = 0) {
            // Enable and get current depth map
            var depthMap = scene.enableDepthRenderer().getDepthMap();
            // Circle of confusion value for each pixel is used to determine how much to blur that pixel
            this.circleOfConfusion = new BABYLON.CircleOfConfusionPostProcess("circleOfConfusion", depthMap, 1, camera, BABYLON.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), true, pipelineTextureType);
            pipeline.addEffect(new PostProcessRenderEffect(scene.getEngine(), this.CircleOfConfusionPostProcessId, () => { return this.circleOfConfusion; }, true));  
         
            // Capture circle of confusion texture
            this.depthOfFieldPass = new PassPostProcess("depthOfFieldPass", 1.0, null, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false, pipelineTextureType);
            pipeline.addEffect(new PostProcessRenderEffect(scene.getEngine(), this.DepthOfFieldPassPostProcessId, () => { return this.depthOfFieldPass; }, true));

            // Blur the image but do not blur on sharp far to near distance changes to avoid bleeding artifacts 
            // See section 2.6.2 http://fileadmin.cs.lth.se/cs/education/edan35/lectures/12dof.pdf
            this.depthOfFieldBlurY = new DepthOfFieldBlurPostProcess("verticle blur", new Vector2(0, 1.0), 15, 1.0, camera, depthMap, this.circleOfConfusion, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false, pipelineTextureType);
            pipeline.addEffect(new PostProcessRenderEffect(scene.getEngine(), this.DepthOfFieldBlurYPostProcessId, () => { return this.depthOfFieldBlurY; }, true));
            this.depthOfFieldBlurX = new DepthOfFieldBlurPostProcess("horizontal blur", new Vector2(1.0, 0), 15, 1.0, camera,  depthMap, null, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false, pipelineTextureType);
            pipeline.addEffect(new PostProcessRenderEffect(scene.getEngine(), this.DepthOfFieldBlurXPostProcessId, () => { return this.depthOfFieldBlurX; }, true));

            // Merge blurred images with original image based on circleOfConfusion
            this.depthOfFieldMerge = new DepthOfFieldMergePostProcess("depthOfFieldMerge", this.circleOfConfusion, this.depthOfFieldPass, 1, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), true, pipelineTextureType);
            pipeline.addEffect(new PostProcessRenderEffect(scene.getEngine(), this.DepthOfFieldMergePostProcessId, () => { return this.depthOfFieldMerge; }, true));
        }

        /**
         * Disposes each of the internal effects for a given camera.
         * @param camera The camera to dispose the effect on.
         */
        public disposeEffects(camera:Camera){
            this.depthOfFieldPass.dispose(camera);
            this.circleOfConfusion.dispose(camera);
            this.depthOfFieldBlurX.dispose(camera);
            this.depthOfFieldBlurY.dispose(camera);
            this.depthOfFieldMerge.dispose(camera);
        }
    }
}