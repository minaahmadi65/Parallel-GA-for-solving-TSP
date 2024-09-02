const geneticAlgorithm = require('./main');
const axios = require('axios');

const args = process.argv.slice(2);
const workerIdArg = args.find(arg => arg.startsWith('--worker-id='));
const workerId = workerIdArg ? workerIdArg.split('=')[1] : 'default';

const GA = new geneticAlgorithm.TSPGeneticAlgorithm()

const setting = {
    tspFilePath: '', 
    configsGA: {
        populationSize: '',
        generationSize: '',
        tournamentRate : '',
        elitismRate : '',
        crossoverRate :'',
        mutationRate : ''
    }
};


async function getJob() {
    try {
        const response = await axios.get('http://localhost:3000/get-job');

        return response.data;
    } catch (error) {
        console.error('Failed to get job:', error.message);
        return null;
    }
}

async function sendJobResult(result) {
    try {
        await axios.post('http://localhost:3000/post-result', result);

    } catch (error) {
        console.error('Failed to send job result:', error.message);
    }
}

async function processTask(job) {
  
    console.log(`Worker ID: ${workerId} is Processing job ==> gen:${job.gen} , id:${job.id}`);
   
    const [crossPop1,crossPop2] = GA.Crossover(job.solution[0],job.solution[1])

    const healPop1 = GA.Heal(crossPop1)
    const healPop2 = GA.Heal(crossPop2)

    mutPop1 = GA.MutationSmart(healPop1)
    mutPop2 = GA.MutationSmart(healPop2)
  
    job.solution1 = GA.DeepOptimize(mutPop1)
    job.solution2 = GA.DeepOptimize(mutPop2)
   
    const fit1 = GA.CalculateRouteDistance(job.solution1.tspRoute)
    const fit2 = GA.CalculateRouteDistance(job.solution2.tspRoute)

    job.solution1.tspDistance = fit1;
    job.solution2.tspDistance = fit2;

   return { gen: job.gen, jobId: job.id, solution: [job.solution1, job.solution2] }

}  

async function getSettings() {
    while (true) {  
        try {
            const response = await axios.get('http://localhost:3000/get-settings');

            setting.tspFilePath = response.data.tspFilePath;
            setting.configsGA = response.data.configsGA;

            const allCities = GA.ImportTSPFile(setting.tspFilePath);
            console.log(`Worker ID ${workerId} is using TSP file: ${setting.tspFilePath}`);
            return true;
        } catch (error) {
            console.error('Failed to get settings:', error.message);
            await new Promise(resolve => setTimeout(resolve, 10000)); 
        }
    }
}


async function startWorking() {
    let jobFailCounter = 0; 

    const settingsLoaded = await getSettings();
    if (!settingsLoaded) {
        console.log('Failed to load settings, stopping worker...');
        return;
    }
    
    while (true) {
        const job = await getJob();
        if (job) {
            jobFailCounter = 0;  
            try {
                const result = await processTask(job);
             
                await sendJobResult(result);
            } catch (error) {
                console.error('Error processing job:', error);
            }
         } else {
            jobFailCounter++;  
            if (jobFailCounter >= 100) {
                console.log('Failed to get jobs 100 consecutive times, reloading settings...');
                await getSettings(); 
                jobFailCounter = 0;  
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

startWorking();