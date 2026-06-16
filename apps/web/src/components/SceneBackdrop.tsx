export function SceneBackdrop() {
  return (
    <div aria-hidden='true' className='scene-backdrop'>
      <div className='scene-orb scene-orb--a' />
      <div className='scene-orb scene-orb--b' />
      <div className='scene-orb scene-orb--c' />
      <div className='scene-grid scene-grid--floor' />
      <div className='scene-grid scene-grid--ceil' />
    </div>
  )
}
