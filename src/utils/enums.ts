type EnumMember = { name: string, id: number }
export function mapEnum<T>(data: T): EnumMember[] {
  return Object.keys(data)
    .filter(key => !isNaN(Number(data[key])))
    .map<EnumMember>((key: string) => ({ name: key, id: data[key] }));
}


export function *enumMembers(enumType: any) { // there is no generic enum type :(
  for (let item in enumType) {
    if (isNaN(Number(item))) {
      yield enumType[item];
    }
  }
}
