# Bemesko's fork of Destreamer

- This fork is motivated by the [Official Retirement of Microsoft Stream (Classic)](https://learn.microsoft.com/en-us/stream/streamnew/stream-classic-to-new-migration-overview)
- Some of my customers need to download loads of videos from Stream that the official Microsoft Migrator tool wasn't able to migrate
- The original Destreamer isn't resilient enough to handle downloading too many videos at once
- If you are a maintainer of the original repository please reach out so I can merge my changes upstream
- If you want to learn more about destreamer please check out the original repository at [snobu/destreamer](https://github.com/snobu/destreamer)

## Fork Checklist

- [X] Write the main to-dos for the fork
- [X] Replace non catastrophic exceptions with warnings
- [X] Store the full GUIDs for each video (just save the original GUID instead of processing it)
- [X] Explicitly state the video's GUID in verbose logs for ease of debugging/removing videos from the list
- [X] Log the index of the video being downloaded so far
- [X] Handle client request loop (AADSTS50196) that happens after trying to refresh the token too often
  - I sort of handled this by increasing the interval between token requests and fixing the retry logic in the refresh token function
- [X] (Good to Have) Include current time in logs
- [X] Skip downloading metadata for already downloaded videos
- [X] Create a structured (csv) log file to report the status of all video downloads
  - This is useful for my specific use case that involves tracking all videos that are being backed up
  - [X] Possible statuses:
    - [X] Already exists
    - [X] Downloaded successfully
    - [X] Download failed
      - [X] Video doesn't exist
      - [X] Not enough permissions to get video
      - [X] Video was migrated to Sharepoint (and redirects when trying to download from Stream)
- [ ] Ensure exceptions are handled properly and only end the program when absolutely fatal
  - [ ] If a video download fails, log that it failed and move on with the rest instead of panicking
  - [ ] If fetching metadata fails, log the full video GUID
  - [ ] Implement retries for all actions involving external systems (Stream and/or FFMPEG)
- [ ] Make a Dockerfile with this tool so I don't need to worry about my environments anymore
- [ ] (Good to Have) Persist video metadata so we don't have to wait for it to be fetched each time (this becomes really annoying when working with 100+ videos)

---

Below is all of the information from the original README that still may apply to this fork:

## Prereqs

- [**Node.js**][node]: You'll need Node.js version 8.0 or higher. A GitHub Action runs tests on all major Node versions on every commit. One caveat for Node 8, if you get a `Parse Error` with `code: HPE_HEADER_OVERFLOW` you're out of luck and you'll need to upgrade to Node 10+. PLEASE NOTE WE NO LONGER TEST BUILDS AGAINST NODE 8.x. YOU ARE ON YOUR OWN.
- **npm**: usually comes with Node.js, type `npm` in your terminal to check for its presence
- [**ffmpeg**][ffmpeg]: a recent version (year 2019 or above), in `$PATH` or in the same directory as this README file (project root).
- [**git**][git]: one or more npm dependencies require git.

Destreamer takes a [honeybadger](https://www.youtube.com/watch?v=4r7wHMg5Yjg) approach towards the OS it's running on. We've successfully tested it on Windows, macOS and Linux.

## Limits and limitations

Make sure you use the right script (`.sh`, `.ps1` or `.cmd`) and escape char (if using line breaks) for your shell.
PowerShell uses a backtick [ **`** ] and cmd.exe uses a caret [ **^** ].

Note that destreamer won't run in an elevated (Administrator/root) shell. Running inside **Cygwin/MinGW/MSYS** may also fail, please use **cmd.exe** or **PowerShell** if you're on Windows.

**WSL** (Windows Subsystem for Linux) is not supported as it can't easily pop up a browser window. It *may* work by installing an X Window server (like [Xming][xming]) and exporting the default display to it (`export DISPLAY=:0`) before running destreamer. See [this issue for more on WSL v1 and v2][wsl].

## Can i plug in my own browser?

Yes, yes you can. This may be useful if your main browser has some authentication plugins that are required for you to logon to your Microsoft Stream tenant.
To use your own browser for the authentication part, locate the following snippet in `src/destreamer.ts` and `src/TokenCache.ts`:

```typescript
const browser: puppeteer.Browser = await puppeteer.launch({
  executablePath: getPuppeteerChromiumPath(),
  // …
});
```

Navigate to `chrome://version` in the browser you want to plug in and copy executable path from there. Use double backslash for Windows.

Now, change `executablePath` to reflect the path to your browser and profile (i.e. to use Microsoft Edge on Windows):

```typescript
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
```

You can add `userDataDir` right after `executablePath` with the path to your browser profile (also shown in `chrome://version`) if you want that loaded as well.

Remember to rebuild (`npm run build`) every time you change this configuration.

## How to build

To build destreamer clone this repository, install dependencies and run the build script -

```sh
git clone https://github.com/snobu/destreamer
cd destreamer
npm install
npm run build
```

## Usage

```sh
$ ./destreamer.sh

Options:
  --help                  Show help                                                                            [boolean]
  --version               Show version number                                                                  [boolean]
  --username, -u          The username used to log into Microsoft Stream (enabling this will fill in the email field for
                          you).                                                                                 [string]
  --videoUrls, -i         List of urls to videos or Microsoft Stream groups.                                     [array]
  --inputFile, -f         Path to text file containing URLs and optionally outDirs. See the README for more on outDirs.
                                                                                                                [string]
  --outputDirectory, -o   The directory where destreamer will save your downloads.          [string] [default: "videos"]
  --outputTemplate, -t    The template for the title. See the README for more info.
                                                                [string] [default: "{title} - {publishDate} {uniqueId}"]
  --keepLoginCookies, -k  Let Chromium cache identity provider cookies so you can use "Remember me" during login.
                          Must be used every subsequent time you launch Destreamer if you want to log in automatically.
                                                                                              [boolean] [default: false]
  --noExperiments, -x     Do not attempt to render video thumbnails in the console.           [boolean] [default: false]
  --simulate, -s          Disable video download and print metadata information to the console.
                                                                                              [boolean] [default: false]
  --verbose, -v           Print additional information to the console (use this before opening an issue on GitHub).
                                                                                              [boolean] [default: false]
  --closedCaptions, --cc  Check if closed captions are available and let the user choose which one to download (will not
                          ask if only one available).                                         [boolean] [default: false]
  --noCleanup, --nc       Do not delete the downloaded video file when an FFmpeg error occurs.[boolean] [default: false]
  --vcodec                Re-encode video track. Specify FFmpeg codec (e.g. libx265) or set to "none" to disable video.
                                                                                              [string] [default: "copy"]
  --acodec                Re-encode audio track. Specify FFmpeg codec (e.g. libopus) or set to "none" to disable audio.
                                                                                              [string] [default: "copy"]
  --format                Output container format (mkv, mp4, mov, anything that FFmpeg supports).
                                                                                               [string] [default: "mkv"]
  --skip                  Skip download if file already exists.                               [boolean] [default: false]
```

- both --videoUrls and --inputFile also accept Microsoft Teams Groups url so if your Organization placed the videos you are interested in a group you can copy the link and Destreamer will download all the videos it can inside it! A group url looks like this <https://web.microsoftstream.com/group/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>

- Passing `--username` is optional. It's there to make logging in faster (the username field will be populated automatically on the login form).

- You can use an absolute path for `-o` (output directory), for example `/mnt/videos`.

- We default to `.mkv` for the output container. If you prefer something else (like `mp4`), pass `--format mp4`.

Download a video -

```sh
./destreamer.sh -i "https://web.microsoftstream.com/video/VIDEO-1"
```

Download a video and re-encode with HEVC (libx265) -

```sh
./destreamer.sh -i "https://web.microsoftstream.com/video/VIDEO-1" --vcodec libx265
```

Download a video and speed up the interactive login by automagically filling in the username -

```sh
./destreamer.sh -u user@example.com -i "https://web.microsoftstream.com/video/VIDEO-1"
```

Download a video to a custom path -

```sh
./destreamer.sh -i "https://web.microsoftstream.com/video/VIDEO-1" -o /Users/hacker/Downloads
```

Download two or more videos -

```sh
./destreamer.sh -i "https://web.microsoftstream.com/video/VIDEO-1" \
                     "https://web.microsoftstream.com/video/VIDEO-2"
```

Download many videos but read URLs from a file -

```sh
./destreamer.sh -f list.txt
```

### Input file

You can create a `.txt` file containing your video URLs, one video per line. The text file can have any name, followed by the `.txt` extension.
Additionally you can have destreamer download each video in the input list to a separate directory.
These optional lines must start with white space(s).

Usage -

```text
https://web.microsoftstream.com/video/xxxxxxxx-aaaa-xxxx-xxxx-xxxxxxxxxxxx
 -dir="videos/lessons/week1"
https://web.microsoftstream.com/video/xxxxxxxx-aaaa-xxxx-xxxx-xxxxxxxxxxxx
 -dir="videos/lessons/week2"
```

### Title template

The `-t` option allows user to specify a custom filename for the videos.

You can use one or more of the following magic sequence which will get substituted at runtime. The magic sequence must be surrounded by curly brackets like this: `{title} {publishDate}`

- `title`: Video title
- `duration`: Video duration in HH:MM:SS format
- `publishDate`: The date when the video was published in YYYY-MM-DD format
- `publishTime`: The time the video was published in HH:MM:SS format
- `author`: Name of video publisher
- `authorEmail`: E-mail of video publisher
- `uniqueId`: An *unique-enough* ID generated from the video metadata

Examples -

```sh
Input:
    -t 'This is an example'

Expected filename:
    This is an example.mkv

Input:
    -t 'This is an example by {author}'

Expected filename:
    This is an example by lukaarma.mkv

Input:
    -t '{title} - {duration} - {publishDate} - {publishTime} - {author} - {authorEmail} - {uniqueId}'

Expected filename:
    This is an example - 0:16:18 - 2020-07-30 - 10:30:13 - lukaarma - example@domain.org - #3c6ca929.mkv
```

## Expected output

Windows Terminal -

![screenshot](assets/screenshot-win.png)

iTerm2 on a Mac -

![screenshot](assets/screenshot-mac.png)

By default, downloads are saved under project root `Destreamer/videos/` ( Not the system media Videos folder ), unless specified by `-o` (output directory).

## KNOWN BUGS

If you get a

```sh
[FATAL ERROR] Unknown error: exit code 4
```

when running destreamer, then make sure you're running a recent (post year 2019), stable version of **ffmpeg**.

## Contributing

See: [Contributing at snobu/destreamer](https://github.com/snobu/destreamer#contributing)

## Found a bug?

Please open an [issue](https://github.com/snobu/destreamer/issues) in the original repository, unless it's specific to the changes I'm making in this fork.

[ffmpeg]: https://www.ffmpeg.org/download.html
[xming]: https://sourceforge.net/projects/xming/
[node]: https://nodejs.org/en/download/
[git]: https://git-scm.com/downloads
[wsl]: https://github.com/snobu/destreamer/issues/90#issuecomment-619377950
