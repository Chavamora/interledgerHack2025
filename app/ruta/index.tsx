import {Button} from '@/components/ui/button.tsx'
export default function Screen(){
  let buttonCount = 0;

  const increaseCount = () => {
    buttonCount += 1;
    console.log(buttonCount)
  }

  return (

    
    <div>
      hola mundo {buttonCount}
      <Button onClick={()=>increaseCount()}></Button>
    </div>
  )
}
