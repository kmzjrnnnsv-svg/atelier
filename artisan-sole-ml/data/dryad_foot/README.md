# Foot shape-function model data

<https://doi.org/10.5061/dryad.g4f4qrfwt>

3D foot scans (PLY files) while bearing minimal weight (mBW) and full body weight (fBW), as well as a MATLAB file containing foot and ankle joint angles and moments from level, incline and decline treadmill walking and running.

## Description of the data and file structure

### 3D foot scans (\~920 MB):

The 3D foot scans, collected while the participant's dominant foot was either bearing minimal weight (mBW) or their full body-weight (fBW), are provided as PLY files.
File names contain the participant's ID, the weight-bearing condition and which foot was scanned (e.g., *045_fBW_R.ply*: a scan of the 45th participant's right foot while bearing full body-weight).
For left-foot dominant participants, the foot scan was reflected about its length axis to be comparable to the feet of right-foot dominant participants. Hence, the filenames for these scans contain *Lr* instead of *R*.

### Joint Kinematics and Kinetics (\~280 MB):

The file *treadmill_data.mat* contains MATLAB structures of the stance phase time-normalised joint

*   angles (IK) and
*   moments (ID).

Each of these structures is subdivided into further structures for each participant (e.g., *p003*), as well as a structure containing the values averaged across all stance phases for each participant (*mean*).
The participant and mean structures are divided into the various locomotor tasks:

*   running downhill
*   running level
*   running uphill
*   walking downhill
*   walking level
*   walking uphill

These, in turn, each contain a matrix of dimensions *101* x *number of stance phases* for each of the following joints:

*   hip
*   knee
*   ankle
*   subtalar
*   midtarsal
*   tarsometatarsal and
*   metatarsophalangeal (mtp).

A table containing the participant information (*info*), including identifier (*ID*), sex (*M/F*), height (in cm), weight (in kg) and leg dominance (*Leg*) is also contained in this file.
