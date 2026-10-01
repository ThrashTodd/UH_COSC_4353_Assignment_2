let queueKey = "queuesmartQueue"
let myQueue = null
let toastTimer = null
let statusList = ["checked-in", "waiting", "almost-ready", "in-service", "served"]

function timeText(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function saveMyQueue() {
  localStorage.setItem(queueKey, JSON.stringify(myQueue))
}

function loadMyQueue() {
  let saved = localStorage.getItem(queueKey)

  if (saved == null) {
    myQueue = null
    return
  }

  myQueue = JSON.parse(saved)

  if (myQueue.status == undefined) {
    myQueue.status = "waiting"
  }
  if (myQueue.room == undefined) {
    myQueue.room = "Room 3"
  }
  if (myQueue.behind == undefined) {
    myQueue.behind = 1
  }
  if (myQueue.startPosition == undefined) {
    myQueue.startPosition = myQueue.position
  }
  if (myQueue.perPerson == undefined) {
    if (myQueue.position > 1) {
      myQueue.perPerson = Math.round(myQueue.wait / (myQueue.position - 1))
    } else {
      myQueue.perPerson = myQueue.wait
    }
  }
  if (myQueue.notifications == undefined) {
    myQueue.notifications = []
    addNotification("You joined a queue", myQueue.service + " · Ticket " + myQueue.ticket + " · Position #" + myQueue.position + " · Estimated wait " + myQueue.wait + " min")
  }
  if (myQueue.status == "waiting" && myQueue.position <= 2) {
    myQueue.status = "almost-ready"
  }

  saveMyQueue()
}

function addNotification(title, message) {
  let newNotification = {
    title: title,
    message: message,
    time: timeText(new Date()),
    read: false
  }
  myQueue.notifications.unshift(newNotification)
}

function getWait() {
  if (myQueue.status == "in-service" || myQueue.status == "served") {
    return 0
  }
  return (myQueue.position - 1) * myQueue.perPerson
}

function waitText() {
  let wait = getWait()
  if (myQueue.status == "in-service") {
    return "Now"
  }
  if (myQueue.status == "served") {
    return "Done"
  }
  if (wait == 0) {
    return "Next up"
  }
  return "~" + wait + " min"
}

function showToast(title, text) {
  let toast = document.getElementById("toast")
  document.getElementById("toastTitle").innerText = title
  document.getElementById("toastText").innerText = text
  toast.classList.remove("hidden")

  clearTimeout(toastTimer)
  toastTimer = setTimeout(function() {
    toast.classList.add("hidden")
  }, 3500)
}

function addPersonBox(line, type, label, hoverText) {
  let box = document.createElement("div")
  box.className = "person " + type
  box.innerText = label
  box.title = hoverText
  line.appendChild(box)
}

function updatePage() {
  if (myQueue == null) {
    document.getElementById("activeView").classList.add("hidden")
    document.getElementById("emptyView").classList.remove("hidden")
    return
  }
  document.getElementById("activeView").classList.remove("hidden")
  document.getElementById("emptyView").classList.add("hidden")

  let stillWaiting = false
  if (myQueue.status == "waiting" || myQueue.status == "almost-ready") {
    stillWaiting = true
  }

  let bannerTitle = ""
  let bannerMessage = ""
  let badgeText = ""
  let badgeColor = ""

  if (myQueue.status == "waiting") {
    bannerTitle = "You're in line"
    bannerMessage = "We'll notify you here when it's almost your turn. Feel free to relax in the waiting area."
    badgeText = "Waiting"
    badgeColor = "success"
  } else if (myQueue.status == "almost-ready") {
    bannerTitle = "Almost your turn"
    bannerMessage = "Please stay close to the front desk. You'll be called in shortly."
    badgeText = "Almost ready"
    badgeColor = "warning"
  } else if (myQueue.status == "in-service") {
    bannerTitle = "It's your turn"
    bannerMessage = "Please head to " + myQueue.room + " now. Your service is in progress."
    badgeText = "In service"
    badgeColor = "info"
  } else {
    bannerTitle = "Visit complete"
    bannerMessage = "Your visit is complete. Thanks for using QueueSmart!"
    badgeText = "Served"
    badgeColor = "neutral"
  }

  document.getElementById("hero").className = "hero-card " + myQueue.status
  document.getElementById("heroEyebrow").innerText = bannerTitle
  document.getElementById("heroTitle").innerText = myQueue.service + " with " + myQueue.doctor
  document.getElementById("heroMessage").innerText = bannerMessage
  document.getElementById("ticketNumber").innerText = myQueue.ticket
  document.getElementById("ticketRoom").innerText = myQueue.room

  let joinedTime = timeText(new Date(myQueue.joinedAt))

  if (stillWaiting) {
    document.getElementById("statPosition").innerText = "#" + myQueue.position
    document.getElementById("statAhead").innerText = myQueue.position - 1
  } else {
    document.getElementById("statPosition").innerText = "—"
    document.getElementById("statAhead").innerText = 0
  }
  document.getElementById("statWait").innerText = waitText()
  document.getElementById("statCheckedIn").innerText = joinedTime

  let badge = document.getElementById("statusBadge")
  badge.className = "badge " + badgeColor
  badge.innerText = badgeText

  let currentStep = statusList.indexOf(myQueue.status)
  let stepItems = document.querySelectorAll("#stepper li")
  for (let i = 0; i < stepItems.length; i++) {
    stepItems[i].classList.remove("done")
    stepItems[i].classList.remove("current")

    if (i < currentStep) {
      stepItems[i].classList.add("done")
    } else if (i == currentStep) {
      if (myQueue.status == "served") {
        stepItems[i].classList.add("done")
      } else {
        stepItems[i].classList.add("current")
      }
    }
  }

  let line = document.getElementById("lineViz")
  line.innerHTML = ""
  let peopleCount = 0

  if (myQueue.status == "served") {
    line.innerText = "Your visit is complete."
  } else {
    if (myQueue.status != "in-service") {
      addPersonBox(line, "serving", "●", "Being served")
      peopleCount++

      for (let i = 1; i < myQueue.position; i++) {
        addPersonBox(line, "", "#" + i, "Ahead of you")
        peopleCount++
      }
    }

    addPersonBox(line, "you", "You", "You")
    peopleCount++

    for (let i = 0; i < myQueue.behind; i++) {
      addPersonBox(line, "behind", "", "Behind you")
      peopleCount++
    }
  }
  document.getElementById("lineTitle").innerText = myQueue.doctor + "'s queue"
  document.getElementById("lineCount").innerText = peopleCount + " in queue"

  let percent = 0
  if (stillWaiting) {
    percent = Math.round((myQueue.startPosition - myQueue.position + 1) / (myQueue.startPosition + 1) * 100)
  } else {
    percent = 100
  }
  let bar = document.getElementById("progressBar")
  bar.style.width = percent + "%"
  if (myQueue.status == "served") {
    bar.style.background = "#334155"
  } else if (myQueue.status == "in-service") {
    bar.style.background = "#15803d"
  } else {
    bar.style.background = "#2563eb"
  }
  document.getElementById("progressPct").innerText = percent + "%"

  document.getElementById("dService").innerText = myQueue.service
  document.getElementById("dDoctor").innerText = myQueue.doctor
  document.getElementById("dRoom").innerText = myQueue.room
  document.getElementById("dAvg").innerText = myQueue.perPerson + " min"
  document.getElementById("dJoined").innerText = joinedTime

  document.getElementById("refreshBtn").disabled = (myQueue.status == "served")
  if (myQueue.status == "served") {
    document.getElementById("leaveBtn").innerText = "Close Visit"
  } else {
    document.getElementById("leaveBtn").innerText = "Leave Queue"
  }
  document.getElementById("modalTicket").innerText = myQueue.ticket

  let notifList = document.getElementById("notifList")
  notifList.innerHTML = ""
  for (let i = 0; i < myQueue.notifications.length; i++) {
    let notif = myQueue.notifications[i]

    let box = document.createElement("div")
    box.className = "notification"
    if (notif.read == false) {
      box.classList.add("unread")
    }

    let dot = document.createElement("div")
    dot.className = "notif-dot"

    let textBox = document.createElement("div")

    let title = document.createElement("strong")
    title.innerText = notif.title

    let message = document.createElement("p")
    message.innerText = notif.message

    let time = document.createElement("span")
    time.innerText = notif.time

    textBox.appendChild(title)
    textBox.appendChild(message)
    textBox.appendChild(time)
    box.appendChild(dot)
    box.appendChild(textBox)
    notifList.appendChild(box)
  }
}

function refreshQueue() {
  if (myQueue == null) {
    return
  }

  if (myQueue.status == "waiting" || myQueue.status == "almost-ready") {
    if (myQueue.position > 1) {
      myQueue.position = myQueue.position - 1

      if (Math.random() < 0.5) {
        myQueue.behind = myQueue.behind + 1
      }

      if (myQueue.position <= 2 && myQueue.status == "waiting") {
        myQueue.status = "almost-ready"
        addNotification("Almost ready", "You're almost up. Estimated wait: " + waitText() + ". Please stay near the front desk.")
        showToast("Almost your turn!", "Estimated wait: " + waitText())
      } else {
        addNotification("Queue update", "You moved up to position #" + myQueue.position + ". Estimated wait: " + waitText() + ".")
        showToast("Queue updated", "You're now #" + myQueue.position)
      }
    } else {
      myQueue.status = "in-service"
      addNotification("Service in progress", myQueue.doctor + " is ready for you. Please go to " + myQueue.room + ".")
      showToast("It's your turn!", "Please go to " + myQueue.room)
    }
  } else if (myQueue.status == "in-service") {
    myQueue.status = "served"
    addNotification("Service completed", "Your " + myQueue.service.toLowerCase() + " with " + myQueue.doctor + " is complete. Thanks for visiting!")
    showToast("Visit complete", "Thanks for visiting!")
  }

  saveMyQueue()
  updatePage()
}

function openLeavePopup() {
  if (myQueue.status == "served") {
    leaveQueue()
    return
  }
  document.getElementById("leaveModal").classList.remove("hidden")
  document.body.classList.add("modal-open")
}

function closeLeavePopup() {
  document.getElementById("leaveModal").classList.add("hidden")
  document.body.classList.remove("modal-open")
}

function leaveQueue() {
  let wasServed = (myQueue.status == "served")
  closeLeavePopup()
  localStorage.removeItem(queueKey)
  myQueue = null
  updatePage()

  if (wasServed) {
    showToast("Visit closed", "You can join a new queue anytime.")
  } else {
    showToast("You left the queue", "Your spot has been released.")
  }
}

function markAllRead() {
  if (myQueue == null) {
    return
  }
  for (let i = 0; i < myQueue.notifications.length; i++) {
    myQueue.notifications[i].read = true
  }
  saveMyQueue()
  updatePage()
}

function startSampleQueue() {
  myQueue = {
    service: "Dental Cleaning",
    doctor: "Dr. Asefa",
    wait: 15,
    people: 3,
    position: 4,
    ticket: "C-318",
    joinedAt: new Date().toISOString()
  }
  saveMyQueue()
  loadMyQueue()
  updatePage()
}

document.getElementById("refreshBtn").addEventListener("click", refreshQueue)
document.getElementById("leaveBtn").addEventListener("click", openLeavePopup)
document.getElementById("cancelLeave").addEventListener("click", closeLeavePopup)
document.getElementById("confirmLeave").addEventListener("click", leaveQueue)
document.getElementById("markReadBtn").addEventListener("click", markAllRead)
document.getElementById("sampleBtn").addEventListener("click", startSampleQueue)

document.getElementById("leaveModal").addEventListener("click", function(e) {
  if (e.target.id == "leaveModal") {
    closeLeavePopup()
  }
})

loadMyQueue()
updatePage()