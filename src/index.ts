import createApp from './interface';
import createSimulation from './simulation';


createSimulation()
  .then((simulation) => createApp(simulation))

