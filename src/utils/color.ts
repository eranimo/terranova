export function getHexColor(number){
  return ((number)>>>0).toString(16).slice(-6);
}
