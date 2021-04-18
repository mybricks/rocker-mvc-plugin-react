import {useObservable} from '@hb/rxui'

export default function T() {
  const obj = useObservable({id:333})
  return (
    <div>{obj.id}</div>
  )
}