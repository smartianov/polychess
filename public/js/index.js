/* global fetch */

document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault()

  const data = new URLSearchParams()

  for (const param of event.target.querySelectorAll('input')) {
    data.set(param.name, param.value)
  }

  const response = await fetch(event.target.action, {
    method: 'POST',
    body: data
  })

  if (response.ok) {
    window.location.reload()
  } else {
    document.querySelector('#message').textContent = 'Wrong nickname or password'
  }
})

document.querySelector('#signUp').addEventListener('click', event => {
  event.target.form.action = '/signup'
})
